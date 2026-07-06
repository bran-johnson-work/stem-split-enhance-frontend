"use client";

// KN-24 — Processing status view: the 7-state stepper.
//
// Renders the fixed pipeline (queued → analyzing → separating → cleaning →
// mastering → completed) as a vertical rail. Each stage is drawn in *its own*
// state color once reached (AC: "each stage styled with its state color"), so a
// finished run reads as a gradient of the seven state tokens. The single active
// stage carries a soft glow and its own per-stage progress bar (KN-25).

import * as React from "react";
import {
  AudioLines,
  Check,
  Clock,
  type LucideIcon,
  Scissors,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  PIPELINE_STAGES,
  STAGE_COLORS,
  stageStateFor,
  type StageState,
} from "@/lib/processing/pipeline";
import type { ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGE_ICON: Record<ProjectStatus, LucideIcon> = {
  queued: Clock,
  analyzing: AudioLines,
  separating: Scissors,
  cleaning: Sparkles,
  mastering: SlidersHorizontal,
  completed: Check,
  failed: Clock, // not rendered in the stepper
};

export function ProcessingStepper({
  current,
  stageProgress,
  className,
}: {
  current: ProjectStatus;
  /** Progress within the active stage, 0..100 (drives the active stage bar). */
  stageProgress: number;
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-1", className)}>
      {PIPELINE_STAGES.map((stage, i) => {
        const state = stageStateFor(stage.status, current);
        const isLast = i === PIPELINE_STAGES.length - 1;
        return (
          <StepRow
            key={stage.status}
            status={stage.status}
            label={stage.label}
            description={state === "active" ? stage.active : stage.description}
            state={state}
            progress={stageProgress}
            connect={!isLast}
          />
        );
      })}
    </ol>
  );
}

function StepRow({
  status,
  label,
  description,
  state,
  progress,
  connect,
}: {
  status: ProjectStatus;
  label: string;
  description: string;
  state: StageState;
  progress: number;
  connect: boolean;
}) {
  const color = STAGE_COLORS[status];
  const Icon = STAGE_ICON[status];
  const reached = state !== "pending";
  // Sub-progress is only meaningful for the working stages — `queued` is a wait
  // (no percentage) and `completed` is terminal.
  const showProgress =
    state === "active" && status !== "queued" && status !== "completed";

  return (
    <li className="flex gap-4">
      {/* Node + connector rail */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors",
            reached
              ? cn(color.bg, color.border, "text-white")
              : "border-border bg-card text-muted-foreground",
            state === "active" && cn("ring-4", color.ring),
          )}
        >
          <Icon
            className={cn("size-4", state === "active" && "animate-pulse")}
          />
        </span>
        {connect && (
          <span
            className={cn(
              "mt-1 w-0.5 flex-1 rounded-full transition-colors",
              state === "done" ? color.bg : "bg-border",
            )}
          />
        )}
      </div>

      {/* Copy + active-stage progress */}
      <div className={cn("min-w-0 flex-1", connect ? "pb-5" : "pb-1")}>
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "font-medium transition-colors",
              state === "pending" && "text-muted-foreground",
              state === "active" && color.text,
            )}
          >
            {label}
          </p>
          {showProgress && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                color.softBg,
                color.text,
              )}
            >
              {progress}%
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>

        {showProgress && (
          <Progress
            value={progress}
            className="mt-2 h-1.5 bg-muted"
            indicatorClassName={color.bg}
          />
        )}
      </div>
    </li>
  );
}
