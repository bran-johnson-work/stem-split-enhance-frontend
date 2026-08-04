

import { apiFetch } from "@/lib/api/fetch";
import { apiUrl } from "@/lib/config";
import type {
  EngineRunConfig,
  EngineVersion,
  Stem,
  StemComparison,
  StemKind,
  VersionOutput,
  VersionState,
} from "@/lib/types";

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
    sizeBytes: 0,
    durationSec: 0,
  };
}

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

// ---- v1 / v2 comparison ---------------------------------------------------

interface EngineConfigResponse {
  vocals_model?: string;
  rhythm_model?: string;
  enhancement_level?: string;
  overlap?: number;
  shifts?: number;
}

interface VersionStemsResponse {
  engine_version: string;
  job_id: string;
  status: BackendJobStatus;
  engine_config: EngineConfigResponse | null;
  stems: StemDownload[];
}

interface StemsCompareResponse {
  project_id: string;
  /** Union of stem names across versions, already in the backend's display order. */
  stem_names: string[];
  versions: VersionStemsResponse[];
}

/** Anything the backend doesn't recognise as a known engine falls back to v1. */
function mapEngineVersion(value: string): EngineVersion {
  return value.trim().toLowerCase() === "v2" ? "v2" : "v1";
}

function mapVersionState(status: BackendJobStatus): VersionState {
  if (status === "completed") return "completed";
  if (status === "failed" || status === "cancelled") return "failed";
  return "processing";
}

function mapEngineConfig(
  res: EngineConfigResponse | null,
): EngineRunConfig | null {
  if (!res) return null;
  return {
    vocalsModel: res.vocals_model,
    rhythmModel: res.rhythm_model,
    enhancementLevel: res.enhancement_level,
    overlap: res.overlap,
    shifts: res.shifts,
  };
}

function mapVersionOutput(res: VersionStemsResponse): VersionOutput {
  // Keyed by raw `stem_name` while it is still in scope. This is the only place
  // that name exists — `Stem.id` embeds the job id, so it can't pair v1 with v2.
  const stems: Record<string, Stem> = {};
  for (const dl of res.stems) {
    stems[dl.stem_name.toLowerCase().trim()] = mapStem(res.job_id, dl);
  }
  return {
    version: mapEngineVersion(res.engine_version),
    jobId: res.job_id,
    state: mapVersionState(res.status),
    stems,
    config: mapEngineConfig(res.engine_config),
  };
}

/**
 * Both engine versions' output for a project, in one request.
 *
 * The backend deliberately returns this as a single call rather than a job list
 * plus N stem lookups, because the compare screen needs every signed URL present
 * before it can start two transports on the same playhead.
 */
export async function getStemsComparison(
  projectId: string,
): Promise<StemComparison> {
  const res = await apiFetch<StemsCompareResponse>(
    apiUrl(`/projects/${projectId}/stems/compare`),
  );
  return {
    stemNames: res.stem_names.map((name) => name.toLowerCase().trim()),
    versions: res.versions.map(mapVersionOutput),
  };
}
