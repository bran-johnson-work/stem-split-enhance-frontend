// The V2/V3 audio restoration pipeline.
//
// This is a different service from stem separation: separation splits one track
// into stems, restoration repairs and enhances one piece of audio. It runs on a
// separate GPU host that the browser cannot reach directly — it has no CORS and
// authenticates with a static API key — so every call here goes to our own
// backend, which proxies it.
//
// The two stages are chained by the caller, in order:
//   1. POST /projects/{id}/restoration                  {stage:"v2"}
//   2. poll  /projects/{id}/restoration/{jobId}          until finished
//   3. POST /projects/{id}/restoration                  {stage:"v3", after_job_id}
//   4. poll again
// Step 3 must wait for step 2: V3's input is the file V2 writes, so starting it
// early has nothing to read.

import { apiFetch } from "@/lib/api/fetch";
import { apiUrl } from "@/lib/config";

export type RestorationStage = "v2" | "v3";
export type RestorationStatus = "queued" | "running" | "done" | "failed";

// ---- Backend response shapes ---------------------------------------------

interface RestorationOutputResponse {
  key: string;
  url: string;
  expires_in: number;
}

interface RestorationJobResponseWire {
  id: string;
  project_id: string;
  stage: RestorationStage;
  status: RestorationStatus;
  parent_id: string | null;
  /** The pipeline's step log, oldest first. There is no percentage — see below. */
  progress: string[];
  current_step: string;
  is_finished: boolean;
  output: RestorationOutputResponse | null;
  report: Record<string, unknown> | null;
  quality: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface ServiceStatusWire {
  enabled: boolean;
  reachable: boolean;
  cuda: boolean;
  gpu: string | null;
  apollo: boolean;
  bucket_configured: boolean;
  queue_depth: number;
  detail: string | null;
}

// ---- Domain shapes --------------------------------------------------------

export interface RestorationJob {
  id: string;
  projectId: string;
  stage: RestorationStage;
  status: RestorationStatus;
  parentId: string | null;
  /** Every step the pipeline has reported, oldest first. */
  progress: string[];
  /** The most recent step, or "" before the first one arrives. */
  currentStep: string;
  isFinished: boolean;
  isFailed: boolean;
  /** Signed URL for the restored audio. Null until the run finishes. */
  url: string | null;
  outputKey: string | null;
  report: Record<string, unknown> | null;
  quality: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RestorationServiceStatus {
  enabled: boolean;
  reachable: boolean;
  cuda: boolean;
  gpu: string | null;
  /** False when the Apollo checkout is missing — bandwidth extension will fail. */
  apollo: boolean;
  bucketConfigured: boolean;
  queueDepth: number;
  detail: string | null;
}

export interface StartRestorationInput {
  stage: RestorationStage;
  /** The finished V2 job to consume. V3 only; omit to run V3 on the original. */
  afterJobId?: string;
  fileId?: string;
  tempo?: boolean;
  denoise?: boolean;
  bandwidth?: boolean;
  quality?: boolean;
}

function mapJob(wire: RestorationJobResponseWire): RestorationJob {
  return {
    id: wire.id,
    projectId: wire.project_id,
    stage: wire.stage,
    status: wire.status,
    parentId: wire.parent_id,
    progress: wire.progress ?? [],
    currentStep: wire.current_step ?? "",
    isFinished: wire.is_finished,
    isFailed: wire.status === "failed",
    url: wire.output?.url ?? null,
    outputKey: wire.output?.key ?? null,
    report: wire.report,
    quality: wire.quality,
    errorMessage: wire.error_message,
    createdAt: wire.created_at,
    completedAt: wire.completed_at,
  };
}

// ---- Calls ----------------------------------------------------------------

/** Whether restoration is available, and on what hardware. Never throws on an
 *  unreachable service — an unavailable pipeline is a state the UI renders. */
export function getServiceStatus(): Promise<RestorationServiceStatus> {
  return apiFetch<ServiceStatusWire>(apiUrl("/restoration/status")).then((w) => ({
    enabled: w.enabled,
    reachable: w.reachable,
    cuda: w.cuda,
    gpu: w.gpu,
    apollo: w.apollo,
    bucketConfigured: w.bucket_configured,
    queueDepth: w.queue_depth,
    detail: w.detail,
  }));
}

/** Start one stage. Idempotent while that stage is already running — a second
 *  call returns the in-flight job rather than queueing a duplicate. */
export function startRestoration(
  projectId: string,
  input: StartRestorationInput,
): Promise<RestorationJob> {
  return apiFetch<RestorationJobResponseWire>(
    apiUrl(`/projects/${projectId}/restoration`),
    {
      method: "POST",
      json: {
        stage: input.stage,
        after_job_id: input.afterJobId ?? null,
        file_id: input.fileId ?? null,
        tempo: input.tempo ?? true,
        denoise: input.denoise ?? true,
        bandwidth: input.bandwidth ?? true,
        quality: input.quality ?? false,
      },
    },
  ).then(mapJob);
}

/** Poll one run. The backend refreshes it from the upstream unless it is done. */
export function getRestorationJob(
  projectId: string,
  jobId: string,
): Promise<RestorationJob> {
  return apiFetch<RestorationJobResponseWire>(
    apiUrl(`/projects/${projectId}/restoration/${jobId}`),
  ).then(mapJob);
}

/** Every restoration run on a project, oldest first. */
export function listRestorationJobs(projectId: string): Promise<RestorationJob[]> {
  return apiFetch<RestorationJobResponseWire[]>(
    apiUrl(`/projects/${projectId}/restoration`),
  ).then((rows) => rows.map(mapJob));
}
