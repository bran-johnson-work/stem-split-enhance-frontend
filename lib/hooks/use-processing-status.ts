"use client";

// Transport-agnostic processing status. Every processing surface (stepper,
// waveform, progress) consumes only the `{ status, progress }` this returns, so
// how those numbers are produced can change without touching a component.
//
// Two modes, chosen by env:
//   • Mock (no backend): a local simulator advances progress to completion and
//     derives the stage from it — a self-contained demo.
//   • Real backend: the polled project status (from useProject's refetchInterval)
//     is authoritative; the simulator only *overlays* smooth sub-stage progress
//     while the backend says "processing", capped below 100 so it never claims
//     completion before the backend confirms it (decision: simulated overlay on
//     polling — the backend reports no intra-processing stage or progress).

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
/** In overlay mode the simulator stops here — the backend poll owns completion. */
const OVERLAY_CAP = 97;

interface StatusState {
  status: ProjectStatus;
  progress: number;
}

/**
 * Reconcile the local overlay with the authoritative (polled) status: terminal
 * states are forced, and a queued→processing flip kicks off the overlay. Kept
 * pure so it can run during render (React's "adjust state on a prop change").
 */
function reconcile(prev: StatusState, authStatus: ProjectStatus): StatusState {
  if (authStatus === "completed") return { status: "completed", progress: 100 };
  if (authStatus === "failed") return { status: "failed", progress: 0 };
  if (authStatus === "queued") {
    return prev.status === "queued" ? prev : { status: "queued", progress: 0 };
  }
  if (prev.status === "queued" || isTerminal(prev.status)) {
    return { status: "analyzing", progress: Math.max(prev.progress, 1) };
  }
  return prev;
}

export function useProcessingStatus(project: Project): ProcessingSnapshot {
  const queryClient = useQueryClient();
  const simulated = !USE_REAL_BACKEND;
  const authStatus = project.status;

  const [state, setState] = React.useState<StatusState>(() => ({
    status: project.status,
    progress: project.progress,
  }));

  // Adjust state during render (the blessed pattern — no setState-in-effect):
  //   • on project change, re-seed from the new snapshot;
  //   • in real mode, reconcile with each authoritative (polled) status change.
  const [seededId, setSeededId] = React.useState(project.id);
  const [prevAuth, setPrevAuth] = React.useState(authStatus);
  if (seededId !== project.id) {
    setSeededId(project.id);
    setPrevAuth(authStatus);
    setState({ status: project.status, progress: project.progress });
  } else if (!simulated && prevAuth !== authStatus) {
    setPrevAuth(authStatus);
    setState((prev) => reconcile(prev, authStatus));
  }

  const retry = React.useCallback(() => {
    if (simulated) {
      setState({ status: "queued", progress: 0 });
    } else {
      // No backend re-queue endpoint yet — refetch the authoritative status.
      queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
    }
  }, [simulated, queryClient, project.id]);

  // The simulated advance. In mock mode it runs to completion; in real mode it
  // only advances while the backend is processing, and is capped short of 100.
  React.useEffect(() => {
    const advancing = simulated
      ? !isTerminal(state.status)
      : !isTerminal(authStatus) && authStatus !== "queued";
    if (!advancing) return;

    const cap = simulated ? 100 : OVERLAY_CAP;
    const id = setInterval(() => {
      setState((prev) => {
        if (isTerminal(prev.status)) return prev;
        const next = Math.min(
          cap,
          prev.progress + STEP_MIN + Math.random() * (STEP_MAX - STEP_MIN),
        );
        return { progress: next, status: statusForProgress(next) };
      });
    }, TICK_MS);
    return () => clearInterval(id);
    // Re-arm on each stage transition (mock) and each authoritative change (real).
  }, [simulated, state.status, authStatus]);

  return {
    status: state.status,
    progress: Math.round(state.progress),
    stageProgress: Math.round(stageProgress(state.status, state.progress)),
    isRunning: !isTerminal(state.status),
    isSimulated: simulated,
    retry,
  };
}
