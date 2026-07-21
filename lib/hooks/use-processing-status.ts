"use client";

// Transport-agnostic processing status. Every processing surface (stepper,
// waveform, progress) consumes only the `{ status, progress }` this returns, so
// how those numbers are produced can change without touching a component.
//
// Two modes, chosen by env:
//   • Mock (no backend): a local simulator advances progress to completion and
//     derives the stage from it — a self-contained demo.
//   • Real backend: the polled project is authoritative and is passed straight
//     through. It now carries genuine progress — HttpApi.getProject composes in
//     the worker's latest job (see lib/api/jobs) — so there is nothing left to
//     simulate. The earlier overlay existed only because the backend reported no
//     intra-processing progress; inventing motion on top of real numbers would
//     now just make the bar lie.

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { USE_REAL_BACKEND } from "@/lib/config";
import { queryKeys } from "@/lib/hooks/queries";
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
  /** Restart processing (mock re-queue; real → refetch the authoritative status). */
  retry: () => void;
}

/** Cadence + step size of the simulated advance. Tuned for a legible demo. */
const TICK_MS = 900;
const STEP_MIN = 3;
const STEP_MAX = 7;

interface StatusState {
  status: ProjectStatus;
  progress: number;
}

export function useProcessingStatus(project: Project): ProcessingSnapshot {
  const queryClient = useQueryClient();
  const simulated = !USE_REAL_BACKEND;

  const [state, setState] = React.useState<StatusState>(() => ({
    status: project.status,
    progress: project.progress,
  }));

  // Adjust state during render (the blessed pattern — no setState-in-effect):
  // a different project means the simulator re-seeds from the new snapshot.
  const [seededId, setSeededId] = React.useState(project.id);
  if (seededId !== project.id) {
    setSeededId(project.id);
    setState({ status: project.status, progress: project.progress });
  }

  const retry = React.useCallback(() => {
    if (simulated) {
      setState({ status: "queued", progress: 0 });
      return;
    }
    // No backend re-queue endpoint yet — refetch the authoritative status.
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.detail(project.id),
    });
  }, [simulated, queryClient, project.id]);

  // Mock-only advance. Against a real backend the polled job supplies progress,
  // so no timer runs at all — one less interval per open project detail.
  React.useEffect(() => {
    if (!simulated || isTerminal(state.status)) return;

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
    // Re-arm on each stage transition so the interval tracks the current stage.
  }, [simulated, state.status]);

  const status = simulated ? state.status : project.status;
  const progress = simulated ? state.progress : project.progress;

  return {
    status,
    progress: Math.round(progress),
    stageProgress: Math.round(stageProgress(status, progress)),
    isRunning: !isTerminal(status),
    isSimulated: simulated,
    retry,
  };
}
