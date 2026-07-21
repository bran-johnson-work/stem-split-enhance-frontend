// Real processing-job calls against Dakota's API. This is where a project's
// *live* progress and its finished stems actually come from: `ProjectResponse`
// carries only a coarse status (`processing` / `completed`), while the job row
// carries `progress` (0..100) and a human `current_step`, and the stems endpoint
// mints short-lived signed download URLs.
//
// Real-only, like lib/api/projects — the mock equivalents live in MockApi, and
// lib/api/index picks between the two. Callers go through the KlearNoteApi seam.

import { apiFetch } from "@/lib/api/fetch";
import { apiUrl } from "@/lib/config";
import type { Stem, StemKind } from "@/lib/types";

// ---- Backend response shapes ---------------------------------------------

type BackendJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobResponse {
  id: string;
  project_id: string;
  status: BackendJobStatus;
  /** 0..100. Written by the worker, throttled server-side. */
  progress: number;
  /** Free-text label, e.g. "Separating stems (2/4 models)". Not an enum. */
  current_step: string;
  error_message: string | null;
  attempts: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StemDownload {
  stem_name: string;
  is_enhanced: boolean;
  /** Short-lived signed S3 URL (or a `file://` URI in local-stems dev mode). */
  url: string;
  expires_in: number;
}

interface JobStemsResponse {
  job_id: string;
  status: BackendJobStatus;
  stems: StemDownload[];
}

// ---- Domain shape ---------------------------------------------------------

/** The slice of a job the UI actually consumes. */
export interface JobProgress {
  id: string;
  progress: number;
  /** The worker's own label for what it is doing right now. */
  currentStep: string;
  errorMessage: string | null;
  isFinished: boolean;
  isFailed: boolean;
}

export function mapJob(res: JobResponse): JobProgress {
  return {
    id: res.id,
    progress: clampPercent(res.progress),
    currentStep: res.current_step,
    errorMessage: res.error_message,
    isFinished: res.status === "completed",
    isFailed: res.status === "failed" || res.status === "cancelled",
  };
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Fold the worker's stem names onto the five kinds the delivery UI renders.
 * The engine emits more stems than the UI has lanes for (it splits drums into
 * kick/snare/hi-hats, and can emit instrument sub-stems), so anything
 * unrecognised lands in `other` rather than being dropped — a user should never
 * lose a file just because the UI has no dedicated colour for it.
 */
const STEM_KINDS: Record<string, StemKind> = {
  vocals: "vocals",
  drums: "drums",
  bass: "bass",
  other: "other",
  master: "master",
  mixture: "master",
};

function mapStemKind(name: string): StemKind {
  return STEM_KINDS[name.toLowerCase().trim()] ?? "other";
}

/** Title-case a raw stem name for display: `hi_hats` → `Hi hats`. */
function stemLabel(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function mapStem(jobId: string, dl: StemDownload): Stem {
  return {
    id: `${jobId}-${dl.stem_name}`,
    name: stemLabel(dl.stem_name),
    kind: mapStemKind(dl.stem_name),
    url: dl.url,
    // Neither size nor duration is exposed on the download DTO; the delivery
    // rows already render a missing value as "—" (see lib/delivery/deliverables).
    sizeBytes: 0,
    durationSec: 0,
  };
}

// ---- API calls ------------------------------------------------------------

/**
 * The project's most recent job, or `null` when none has been created yet
 * (a project sits job-less between `upload-complete` and the worker picking it
 * up). The API returns jobs newest-first; a project is re-processable, so only
 * the newest one describes the current state.
 */
export async function getLatestJob(
  projectId: string,
): Promise<JobProgress | null> {
  const jobs = await apiFetch<JobResponse[]>(
    apiUrl(`/projects/${projectId}/jobs`),
  );
  return jobs.length ? mapJob(jobs[0]) : null;
}

/** Signed download URLs for a finished job's stems. */
export async function getJobStems(
  projectId: string,
  jobId: string,
): Promise<Stem[]> {
  const res = await apiFetch<JobStemsResponse>(
    apiUrl(`/projects/${projectId}/jobs/${jobId}/stems`),
  );
  return res.stems.map((dl) => mapStem(jobId, dl));
}
