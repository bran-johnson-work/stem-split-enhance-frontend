"use client";

// One file through the whole restoration pipeline: upload, repair, restore.
//
// Same presigned-upload contract and abort/liveness discipline the separation
// flow uses, but the tail is different. Separation enqueues one worker job;
// restoration runs two *chained* stages on a remote GPU, where the second
// consumes the file the first writes:
//
//   1. POST /projects                                  create the project
//   2. POST /projects/{id}/files/upload-url            presign
//   3. POST <s3 url>   (multipart/form-data)           bytes straight to S3
//   4. POST /projects/{id}/restoration {stage:"v2"}    repair
//   5. poll until done
//   6. POST /projects/{id}/restoration {stage:"v3", after_job_id}   restore
//   7. poll until done
//
// Step 6 cannot start before step 5 finishes: its input is V2's output key, and
// that object does not exist until V2 has written it. That ordering is the whole
// reason the two stages are separate calls rather than one.
//
// Note there is no upload-complete call here. That endpoint also enqueues the stem
// *separation* worker, which is a different pipeline and would burn GPU nobody asked
// for. The backend registers the uploaded object itself on the first restoration
// call — it lists the bucket rather than trusting us, and skips only the enqueue.

import * as React from "react";
import * as projectsApi from "@/lib/api/projects";
import * as restorationApi from "@/lib/api/restoration";
import type { RestorationJob } from "@/lib/api/restoration";
import { xhrUploadPost } from "@/lib/upload/upload-file";
import { audioContentType } from "@/lib/validations/upload";

/** Poll cadence, widening as a run gets long.
 *
 *  Every poll is a proxy call that reaches the GPU host, so a fixed 3s loop spends
 *  the whole of a ten-minute run asking a busy box the same question 200 times. The
 *  first minute stays tight because that is when the queued→running transition and
 *  the first steps land and the user is watching; after that the pipeline emits a
 *  step every minute or two and there is nothing a 3s loop can see that a 10s one
 *  cannot. The elapsed timer ticks locally either way, so the UI keeps moving
 *  between polls. */
const POLL_STEPS: { afterMs: number; everyMs: number }[] = [
  { afterMs: 0, everyMs: 2000 },
  { afterMs: 60_000, everyMs: 5000 },
  { afterMs: 240_000, everyMs: 10_000 },
];

function pollDelay(elapsedMs: number): number {
  let chosen = POLL_STEPS[0].everyMs;
  for (const step of POLL_STEPS) {
    if (elapsedMs >= step.afterMs) chosen = step.everyMs;
  }
  return chosen;
}

/** Weight of each stage in the combined bar. V2 is the longer stage on typical
 *  material, so an even split makes the back half appear to crawl. Matches the
 *  backend's own `restoration_progress.overall`. */
const V2_SHARE = 0.55;

/** Rough wall clock for a full V2+V3 run of a ~3 minute track on the T4 host. Shown
 *  as an expectation, never as a countdown — the bar is driven by real steps, and a
 *  clock running to zero while work continues is worse than no estimate at all. */
export const TYPICAL_RUN_SECONDS = 300;

export type RestorationPhase =
  | "idle"
  | "creating"
  | "uploading"
  | "repairing"
  | "restoring"
  | "done"
  | "error";

export interface RestorationOptions {
  /** Run the V2 repair stage. Off means V3 alone, straight off the original. */
  runRepair: boolean;
  tempo: boolean;
  denoise: boolean;
  bandwidth: boolean;
  /** A/B measurement against the input. Costs ~10s per minute of audio. */
  quality: boolean;
}

export const DEFAULT_OPTIONS: RestorationOptions = {
  runRepair: true,
  tempo: true,
  denoise: true,
  bandwidth: true,
  quality: false,
};

export interface RestorationRunState {
  phase: RestorationPhase;
  file: File | null;
  /** Object URL for the original, so it can be auditioned against the results
   *  without a round trip. Revoked on reset. */
  originalUrl: string | null;
  uploadPct: number;
  projectId: string | null;
  v2: RestorationJob | null;
  v3: RestorationJob | null;
  /** The step the active stage last reported. */
  step: string;
  /** Seconds since the run started, ticking locally between polls. */
  elapsedSeconds: number;
  error: string | null;
}

const INITIAL: RestorationRunState = {
  phase: "idle",
  file: null,
  originalUrl: null,
  uploadPct: 0,
  projectId: null,
  v2: null,
  v3: null,
  step: "",
  elapsedSeconds: 0,
  error: null,
};

/** The whole run as one 0-100 number.
 *
 *  Upload is real progress and is counted, but only for the sliver of wall clock it
 *  actually occupies — a bar that reaches 15% on upload and then sits still for four
 *  minutes of GPU work is a worse lie than one that starts slow.
 */
export function overallPercent(state: RestorationRunState, ranRepair: boolean): number {
  if (state.phase === "done") return 100;
  if (state.phase === "idle" || state.phase === "creating") return 0;
  if (state.phase === "uploading") return Math.round(state.uploadPct * 0.05);

  const v2 = state.v2?.progressPct ?? 0;
  const v3 = state.v3?.progressPct ?? 0;
  const pipeline = ranRepair ? v2 * V2_SHARE + v3 * (1 - V2_SHARE) : v3;
  // The 5% the upload owns is already banked by the time any stage runs.
  return Math.min(99, Math.round(5 + pipeline * 0.95));
}

/** Whichever stage is currently running, for the queue-position readout. */
export function activeJob(state: RestorationRunState) {
  if (state.phase === "restoring") return state.v3;
  if (state.phase === "repairing") return state.v2;
  return null;
}

export function useRestorationRun() {
  const [state, setState] = React.useState<RestorationRunState>(INITIAL);
  const abort = React.useRef<AbortController | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = React.useRef(true);
  // Tracked separately from state so teardown can revoke without reading state.
  const objectUrl = React.useRef<string | null>(null);

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  const patch = React.useCallback((next: Partial<RestorationRunState>) => {
    if (alive.current) setState((prev) => ({ ...prev, ...next }));
  }, []);

  // A local clock, so the UI keeps moving between polls. Without it the page is
  // visibly frozen for whole poll intervals, which on a long run is the difference
  // between "working" and "hung" — and the poll interval widens as the run goes on
  // precisely so we are asking the GPU host less often, not more.
  const startedAt = React.useRef<number | null>(null);
  const running =
    state.phase === "creating" ||
    state.phase === "uploading" ||
    state.phase === "repairing" ||
    state.phase === "restoring";

  React.useEffect(() => {
    if (!running) {
      startedAt.current = null;
      return;
    }
    startedAt.current ??= Date.now();
    const id = setInterval(() => {
      if (!alive.current || startedAt.current === null) return;
      setState((prev) => ({
        ...prev,
        elapsedSeconds: Math.floor((Date.now() - startedAt.current!) / 1000),
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const reset = React.useCallback(() => {
    abort.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    if (alive.current) setState(INITIAL);
  }, []);

  const sleep = React.useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        timer.current = setTimeout(resolve, ms);
      }),
    [],
  );

  /** Poll one stage to a terminal state. Resolves with the finished job, or
   *  null if the run was torn down first. Throws only if the stage failed. */
  const pollStage = React.useCallback(
    async (
      projectId: string,
      jobId: string,
      onUpdate: (job: RestorationJob) => void,
    ): Promise<RestorationJob | null> => {
      const startedAt = Date.now();
      while (alive.current) {
        let job: RestorationJob;
        try {
          job = await restorationApi.getRestorationJob(projectId, jobId);
        } catch {
          // The backend answers a poll from its own stored row even when the GPU
          // host is briefly unreachable, so a throw here is transport-level and
          // transient. Backing off is right; failing the run is not.
          await sleep(pollDelay(Date.now() - startedAt) * 2);
          continue;
        }
        if (!alive.current) return null;

        onUpdate(job);
        if (job.isFailed) {
          throw new Error(
            job.errorMessage ??
              "Restoration failed. The pipeline recorded no reason.",
          );
        }
        if (job.isFinished) return job;
        await sleep(pollDelay(Date.now() - startedAt));
      }
      return null;
    },
    [sleep],
  );

  const start = React.useCallback(
    async (file: File, options: RestorationOptions = DEFAULT_OPTIONS) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const localUrl = URL.createObjectURL(file);
      objectUrl.current = localUrl;

      setState({ ...INITIAL, file, originalUrl: localUrl, phase: "creating" });

      try {
        // 1. A real project, so the run is findable from Projects afterwards.
        const project = await projectsApi.createProject(
          file.name.replace(/\.[^./\\]+$/, "") || "Restoration run",
        );
        if (controller.signal.aborted) return;
        patch({ projectId: project.id, phase: "uploading" });

        // 2 + 3. Presign, then the bytes go straight to S3 — never through our API.
        const signed = await projectsApi.signFileUpload(
          project.id,
          file.name,
          audioContentType(file),
          file.size,
        );
        if (controller.signal.aborted) return;

        await xhrUploadPost(signed.url, signed.fields, signed.storage_key, file, {
          onProgress: (pct) => patch({ uploadPct: pct }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        patch({ uploadPct: 100 });

        // 4 + 5. The repair stage, if it was asked for.
        let parent: RestorationJob | null = null;
        if (options.runRepair) {
          patch({ phase: "repairing", step: "Queued" });
          const started = await restorationApi.startRestoration(project.id, {
            stage: "v2",
            quality: options.quality,
          });
          if (controller.signal.aborted) return;
          patch({ v2: started });

          parent = await pollStage(project.id, started.id, (job) =>
            patch({ v2: job, step: job.currentStep }),
          );
          if (parent === null || controller.signal.aborted) return;
        }

        // 6 + 7. The restoration stage, reading the repair's output when there
        // was one. `afterJobId` is what makes this V2-then-V3 rather than two
        // independent passes over the same original.
        patch({ phase: "restoring", step: "Queued" });
        const v3Started = await restorationApi.startRestoration(project.id, {
          stage: "v3",
          afterJobId: parent?.id,
          tempo: options.tempo,
          denoise: options.denoise,
          bandwidth: options.bandwidth,
          quality: options.quality,
        });
        if (controller.signal.aborted) return;
        patch({ v3: v3Started });

        const finished = await pollStage(project.id, v3Started.id, (job) =>
          patch({ v3: job, step: job.currentStep }),
        );
        if (finished === null || controller.signal.aborted) return;

        patch({ phase: "done", v3: finished, step: "Done" });
      } catch (err) {
        if (controller.signal.aborted) return;
        patch({
          phase: "error",
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    },
    [patch, pollStage],
  );

  return { state, start, reset };
}
