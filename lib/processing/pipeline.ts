// Single source of truth for the KlearNote processing pipeline (KN-24 / KN-25).
//
// The pipeline is a fixed sequence of stages a project moves through after its
// source audio is uploaded. `ProjectStatus` (lib/types) is the wire value; this
// module adds the ordering, human copy, and — crucially — the mapping between a
// project's overall `progress` (0..100) and which stage it is in, so every piece
// of processing UI derives from one place and stays consistent whether status is
// driven by a poll, a socket, or the local simulator (lib/hooks/use-processing-status).

import type { ProjectStatus } from "@/lib/types";
import { PROCESSING_STATES } from "@/lib/types";

/**
 * The happy-path pipeline in order: queued → analyzing → separating →
 * cleaning → mastering → completed. `failed` is terminal but off-path, so it is
 * not part of the stepper sequence. Re-exported from lib/types so the ordering
 * lives in exactly one place.
 */
export const PIPELINE_ORDER = PROCESSING_STATES;

/** Stages where work is actively happening (queued waits; completed/failed are terminal). */
export const WORKING_STATES = [
  "analyzing",
  "separating",
  "cleaning",
  "mastering",
] as const satisfies ProjectStatus[];

export interface StageMeta {
  status: ProjectStatus;
  /** Short label for the stepper node + status copy. */
  label: string;
  /** One-line description of what happens in this stage. */
  description: string;
  /** Present-tense line shown while this stage is the active one. */
  active: string;
  /**
   * Inclusive-exclusive share of the overall 0..100 progress bar this stage owns.
   * `queued` owns nothing (it is the pre-roll wait); the four working stages split
   * the bar evenly; `completed` sits at 100.
   */
  range: [number, number];
}

export const STAGE_META: Record<ProjectStatus, StageMeta> = {
  queued: {
    status: "queued",
    label: "Queued",
    description: "Waiting for an available processing slot.",
    active: "Waiting in the queue…",
    range: [0, 0],
  },
  analyzing: {
    status: "analyzing",
    label: "Analyzing",
    description: "Reading the track — tempo, key and spectral profile.",
    active: "Analyzing the mix…",
    range: [0, 25],
  },
  separating: {
    status: "separating",
    label: "Separating",
    description: "Splitting the mix into vocals, drums, bass and other.",
    active: "Separating stems…",
    range: [25, 50],
  },
  cleaning: {
    status: "cleaning",
    label: "Cleaning",
    description: "Removing bleed and artifacts from each stem.",
    active: "Cleaning up artifacts…",
    range: [50, 75],
  },
  mastering: {
    status: "mastering",
    label: "Mastering",
    description: "Balancing levels and polishing the enhanced master.",
    active: "Mastering the output…",
    range: [75, 100],
  },
  completed: {
    status: "completed",
    label: "Completed",
    description: "Stems and master are ready to download.",
    active: "All done.",
    range: [100, 100],
  },
  failed: {
    status: "failed",
    label: "Failed",
    description: "Processing stopped before it could finish.",
    active: "Processing failed.",
    range: [0, 0],
  },
};

/** Ordered stage metadata for rendering the stepper (excludes `failed`). */
export const PIPELINE_STAGES: StageMeta[] = PIPELINE_ORDER.map((s) => STAGE_META[s]);

export function isTerminal(status: ProjectStatus): boolean {
  return status === "completed" || status === "failed";
}

export function isProcessing(status: ProjectStatus): boolean {
  return !isTerminal(status);
}

/** Position of a status within the happy-path order; -1 for `failed`. */
export function stageIndex(status: ProjectStatus): number {
  return PIPELINE_ORDER.indexOf(status);
}

/**
 * Derive the pipeline stage from an overall progress value. Keeps status and
 * progress in lockstep no matter which transport produced the number, so the
 * mock fixtures (e.g. progress 82 → "mastering") and the live simulator agree.
 */
export function statusForProgress(progress: number): ProjectStatus {
  const p = clamp(progress);
  if (p >= 100) return "completed";
  if (p >= 75) return "mastering";
  if (p >= 50) return "cleaning";
  if (p >= 25) return "separating";
  if (p > 0) return "analyzing";
  return "queued";
}

/**
 * Progress *within* a given stage, 0..100 — what the active stage's own bar
 * shows (KN-25). A stage before `overall` reads as complete (100); one after it
 * reads as not-started (0); the current stage maps its sub-range onto 0..100.
 */
export function stageProgress(status: ProjectStatus, overall: number): number {
  const { range } = STAGE_META[status];
  const [start, end] = range;
  if (end <= start) return status === "completed" ? 100 : 0;
  return clamp(((clamp(overall) - start) / (end - start)) * 100);
}

/** A stage node's state relative to where the project currently is. */
export type StageState = "done" | "active" | "pending";

export function stageStateFor(
  stage: ProjectStatus,
  current: ProjectStatus,
): StageState {
  if (current === "completed") return "done";
  const si = stageIndex(stage);
  const ci = stageIndex(current);
  if (si < ci) return "done";
  if (si === ci) return "active";
  return "pending";
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

// ---------------------------------------------------------------------------
// State colors. Literal class strings (one per state) so Tailwind v4's scanner
// keeps them — mirrors the pattern in components/projects/status-badge.tsx.
// Every processing surface pulls its color from here, so a token change in
// globals.css flows through the stepper, waveform and progress bars at once.
// ---------------------------------------------------------------------------

export interface StageColor {
  /** Foreground text in the state color. */
  text: string;
  /** Solid fill in the state color (e.g. active stepper node). */
  bg: string;
  /** Tinted fill (15%) for soft backgrounds. */
  softBg: string;
  /** Border in the state color. */
  border: string;
  /** Soft focus-style ring/glow (30%). */
  ring: string;
}

export const STAGE_COLORS: Record<ProjectStatus, StageColor> = {
  queued: {
    text: "text-queued",
    bg: "bg-queued",
    softBg: "bg-queued/15",
    border: "border-queued",
    ring: "ring-queued/30",
  },
  analyzing: {
    text: "text-analyzing",
    bg: "bg-analyzing",
    softBg: "bg-analyzing/15",
    border: "border-analyzing",
    ring: "ring-analyzing/30",
  },
  separating: {
    text: "text-separating",
    bg: "bg-separating",
    softBg: "bg-separating/15",
    border: "border-separating",
    ring: "ring-separating/30",
  },
  cleaning: {
    text: "text-cleaning",
    bg: "bg-cleaning",
    softBg: "bg-cleaning/15",
    border: "border-cleaning",
    ring: "ring-cleaning/30",
  },
  mastering: {
    text: "text-mastering",
    bg: "bg-mastering",
    softBg: "bg-mastering/15",
    border: "border-mastering",
    ring: "ring-mastering/30",
  },
  completed: {
    text: "text-completed",
    bg: "bg-completed",
    softBg: "bg-completed/15",
    border: "border-completed",
    ring: "ring-completed/30",
  },
  failed: {
    text: "text-failed",
    bg: "bg-failed",
    softBg: "bg-failed/15",
    border: "border-failed",
    ring: "ring-failed/30",
  },
};
