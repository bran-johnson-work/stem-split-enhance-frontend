"use client";

// KN-25 — Animated waveform + per-stage progress indicator.
//
// A hero panel that visualizes the source track as a bar waveform and "fills"
// it left-to-right with overall progress, tinted in the live stage color. Bars
// under the fill pulse (animate-eq) while a stage is running and a soft playhead
// sits at the fill edge; on completion the whole field settles solid green with
// no motion. Amplitudes come from the shared, deterministic `waveform()` helper
// so SSR and client render identically.

import * as React from "react";
import { waveform } from "@/lib/audio/peaks";
import { STAGE_COLORS, STAGE_META } from "@/lib/processing/pipeline";
import type { ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const BAR_COUNT = 72;

export function ProcessingWaveform({
  status,
  progress,
  running,
  className,
}: {
  status: ProjectStatus;
  /** Overall progress across the pipeline, 0..100. */
  progress: number;
  running: boolean;
  className?: string;
}) {
  const amps = React.useMemo(() => waveform(BAR_COUNT, 3), []);
  const color = STAGE_COLORS[status];
  const filled = Math.round((progress / 100) * BAR_COUNT);

  return (
    <div
      className={cn(
        "bg-card relative overflow-hidden rounded-xl border p-6",
        className,
      )}
    >
      {/* Soft state-colored wash behind the bars */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-[0.07] transition-colors",
          color.bg,
        )}
      />

      <div
        className="relative flex h-28 items-center gap-[3px] sm:h-32"
        role="img"
        aria-label={`Waveform, ${Math.round(progress)}% processed`}
      >
        {amps.map((h, i) => {
          const played = i < filled;
          const isEdge = running && i >= filled - 1 && i <= filled;
          return (
            <span
              key={i}
              className={cn(
                "min-w-px flex-1 rounded-full transition-colors duration-500",
                played ? color.bg : "bg-muted-foreground/20",
                played && running && "animate-eq",
                // currentColor (the state text color) drives the edge glow.
                isEdge && cn(color.text, "shadow-[0_0_10px_currentColor]"),
              )}
              style={{
                height: `${Math.round(h * 100)}%`,
                animationDelay:
                  played && running ? `${(i % 8) * 90}ms` : undefined,
                animationDuration:
                  played && running ? `${900 + (i % 5) * 130}ms` : undefined,
              }}
            />
          );
        })}

        {/* Playhead at the fill edge while running */}
        {running && progress > 0 && progress < 100 && (
          <span
            aria-hidden
            className={cn(
              "absolute top-0 bottom-0 w-0.5 rounded-full transition-[left] duration-700",
              color.bg,
            )}
            style={{ left: `${progress}%` }}
          />
        )}
      </div>

      {/* Caption: live stage line + overall percentage */}
      <div className="relative mt-4 flex items-center justify-between gap-3">
        <p className={cn("text-sm font-medium", color.text)}>
          {STAGE_META[status].active}
        </p>
        <p className="text-muted-foreground text-sm tabular-nums">
          <span className="text-foreground font-semibold">
            {Math.round(progress)}%
          </span>{" "}
          overall
        </p>
      </div>
    </div>
  );
}
