"use client";

// The demo run: one file, one project, one engine version, start to finish.
//
// This is deliberately a self-contained hook rather than a reuse of the upload
// queue (lib/hooks/use-upload-queue.ts). The queue exists to manage *many* files
// with concurrency, cancel and retry; the demo shows one file moving through the
// four backend calls so the flow is legible on screen. Sharing the queue here
// would hide exactly the thing the page is meant to demonstrate.
//
// The four steps are the real presigned-upload contract, in order:
//   1. POST /projects                          -> create the project
//   2. POST /projects/{id}/files/upload-url    -> mint a presigned POST
//   3. POST <s3 url>  (multipart/form-data)    -> bytes go straight to S3
//   4. POST /projects/{id}/upload-complete     -> verify + enqueue the job
// then poll /projects/{id}/jobs until the job finishes and fetch its stems.

import * as React from "react";
import * as jobsApi from "@/lib/api/jobs";
import * as projectsApi from "@/lib/api/projects";
import { xhrUploadPost } from "@/lib/upload/upload-file";
import type { Stem } from "@/lib/types";
import { audioContentType } from "@/lib/validations/upload";

/** Engine build the demo pins. v3 = v2 separation + the restoration chain. */
export const DEMO_ENGINE_VERSION = "v3";

/** How often the job is polled. The worker throttles its own progress writes to
 *  roughly this cadence, so polling faster only costs requests. */
const POLL_MS = 2500;

export type DemoPhase =
  | "idle"
  | "creating"
  | "uploading"
  | "finalizing"
  | "processing"
  | "done"
  | "error";

export interface DemoState {
  phase: DemoPhase;
  file: File | null;
  /** 0-100 transfer progress for the S3 POST. */
  uploadPct: number;
  /** 0-100 render progress reported by the worker. */
  jobPct: number;
  /** The worker's own label, e.g. "Extending bandwidth of vocals". */
  step: string;
  projectId: string | null;
  jobId: string | null;
  stems: Stem[];
  error: string | null;
}

const INITIAL: DemoState = {
  phase: "idle",
  file: null,
  uploadPct: 0,
  jobPct: 0,
  step: "",
  projectId: null,
  jobId: null,
  stems: [],
  error: null,
};

export function useDemoRun() {
  const [state, setState] = React.useState<DemoState>(INITIAL);
  // A run owns an AbortController so leaving the page (or starting over) stops the
  // in-flight transfer instead of letting it finish into a discarded state.
  const abort = React.useRef<AbortController | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = React.useRef(true);

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const patch = React.useCallback((next: Partial<DemoState>) => {
    if (alive.current) setState((prev) => ({ ...prev, ...next }));
  }, []);

  const reset = React.useCallback(() => {
    abort.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    if (alive.current) setState(INITIAL);
  }, []);

  /** Sleep that resolves early — and reports it — when the run is torn down. */
  const sleep = React.useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        timer.current = setTimeout(resolve, ms);
      }),
    [],
  );

  /** Poll one project's newest job until it reaches a terminal state.
   *
   *  Written as a loop rather than a self-scheduling callback: a `useCallback`
   *  that calls itself captures its own stale identity, which is both a lint
   *  error and a real bug once the closure's dependencies change mid-run.
   */
  const poll = React.useCallback(
    async (projectId: string) => {
      while (alive.current) {
        try {
          const job = await jobsApi.getLatestJob(projectId);
          if (!alive.current) return;

          if (job) {
            patch({ jobId: job.id, jobPct: job.progress, step: job.currentStep });

            if (job.isFailed) {
              patch({
                phase: "error",
                error:
                  job.errorMessage ??
                  "Processing failed. The worker recorded no reason — check the job log.",
              });
              return;
            }

            if (job.isFinished) {
              const stems = await jobsApi.getJobStems(projectId, job.id);
              if (!alive.current) return;
              patch({ phase: "done", jobPct: 100, step: "Done", stems });
              return;
            }
          }
          // No job row yet: it can lag a moment behind upload-complete. Keep waiting.
          await sleep(POLL_MS);
        } catch {
          // A transient poll failure is not a failed render — the job is still on
          // the queue. Back off and keep going; only the job itself can fail the run.
          if (!alive.current) return;
          await sleep(POLL_MS * 2);
        }
      }
    },
    [patch, sleep],
  );

  const start = React.useCallback(
    async (file: File) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      setState({ ...INITIAL, file, phase: "creating" });

      try {
        // 1. The project. Named after the file so the demo run is findable later
        //    from the normal Projects screen — it is a real project, not a sandbox.
        const project = await projectsApi.createProject(
          file.name.replace(/\.[^./\\]+$/, "") || "Demo run",
        );
        if (controller.signal.aborted) return;
        patch({ projectId: project.id, phase: "uploading" });

        // 2. The presigned POST. The declared content type is signed into the
        //    policy, so step 3 must send back exactly this value.
        const signed = await projectsApi.signFileUpload(
          project.id,
          file.name,
          audioContentType(file),
          file.size,
        );
        if (controller.signal.aborted) return;

        // 3. The bytes, straight to S3 — they never pass through our API.
        await xhrUploadPost(signed.url, signed.fields, signed.storage_key, file, {
          onProgress: (pct) => patch({ uploadPct: pct }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        // 4. Verify + enqueue, pinned to the demo's engine version.
        patch({ phase: "finalizing", uploadPct: 100 });
        await projectsApi.completeUpload(project.id, DEMO_ENGINE_VERSION);
        if (controller.signal.aborted) return;

        patch({ phase: "processing", step: "Queued" });
        void poll(project.id);
      } catch (err) {
        if (controller.signal.aborted) return;
        patch({
          phase: "error",
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    },
    [patch, poll],
  );

  return { state, start, reset };
}
