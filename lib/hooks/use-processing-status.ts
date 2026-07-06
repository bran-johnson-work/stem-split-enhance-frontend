"use client";

// Transport-agnostic processing status (KN-24 AC: "poll or socket later").
//
// Every processing surface (stepper, waveform, progress) consumes the small
// `{ status, progress }` shape this hook returns and nothing else — so the way
// those numbers are *produced* can change without touching a single component.
//
// Today there is no backend, so we drive a local **simulator**: given a project
// snapshot, it advances progress over time and derives the stage from it
// (lib/processing/pipeline). When Dakota's status endpoint lands, this file is
// the one place to swap the transport:
//
//   • Polling — replace the simulator with `useProject(id, { refetchInterval })`
//     and return `{ status: data.status, progress: data.progress }`.
//   • Socket  — subscribe in the effect and `setSnapshot` on each pushed event.
//
// The `retry()` seam behaves the same way: locally it re-runs the simulation;
// against a real API it would call `api.retryProcessing(id)` then resume the
// live transport. No component changes either way.

import * as React from "react";
import {
  isTerminal,
  stageProgress,
  statusForProgress,
} from "@/lib/processing/pipeline";
import type { Project, ProjectStatus } from "@/lib/types";

export interface ProcessingSnapshot {
  status: ProjectStatus;
  /** Overall progress across the whole pipeline, 0..100. */
  progress: number;
  /** Progress within the current stage, 0..100 (what the active stage bar shows). */
  stageProgress: number;
  /** True while a non-terminal stage is advancing. */
  isRunning: boolean;
  /** Whether these numbers come from the local simulator vs. a real transport. */
  isSimulated: boolean;
  /** Restart processing from `queued` (KN-26 retry). */
  retry: () => void;
}

/** Cadence + step size of the simulated advance. Tuned for a legible demo. */
const TICK_MS = 900;
const STEP_MIN = 3;
const STEP_MAX = 7;

export function useProcessingStatus(project: Project): ProcessingSnapshot {
  const [state, setState] = React.useState(() => ({
    status: project.status,
    progress: project.progress,
  }));

  // Re-seed when navigating between projects (the hook instance is reused).
  // React's blessed "adjust state during render on a prop change" pattern.
  const [seededId, setSeededId] = React.useState(project.id);
  if (seededId !== project.id) {
    setSeededId(project.id);
    setState({ status: project.status, progress: project.progress });
  }

  const retry = React.useCallback(() => {
    setState({ status: "queued", progress: 0 });
  }, []);

  // The simulated transport. A real poll/socket would replace this effect.
  React.useEffect(() => {
    if (isTerminal(state.status)) return;
    const id = setInterval(() => {
      setState((prev) => {
        if (isTerminal(prev.status)) return prev;
        const next = Math.min(
          100,
          prev.progress + STEP_MIN + Math.random() * (STEP_MAX - STEP_MIN),
        );
        return { progress: next, status: statusForProgress(next) };
      });
    }, TICK_MS);
    return () => clearInterval(id);
    // Re-arm on each stage transition; stops once terminal.
  }, [state.status]);

  return {
    status: state.status,
    progress: Math.round(state.progress),
    stageProgress: Math.round(stageProgress(state.status, state.progress)),
    isRunning: !isTerminal(state.status),
    isSimulated: true,
    retry,
  };
}
