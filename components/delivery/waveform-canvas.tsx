"use client";

// A single wavesurfer waveform, plus the states around it.
//
// The canvas itself is `aria-hidden` — a picture of audio means nothing to a
// screen reader. The wrapper carries the semantics: it's a slider over the
// track's timeline, so the player is fully operable from the keyboard (arrows to
// scrub, Home/End to jump), which is what KN-49's keyboard pass will look for.
//
// Seeks are reported upward rather than handled locally: in the mixer every lane
// scrubs *all* lanes, so the owner decides what a seek means.

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import type WaveSurfer from "wavesurfer.js";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/format";
import { useWavesurfer } from "@/lib/hooks/use-wavesurfer";
import type { Stem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Seconds moved per arrow key press. */
const KEY_STEP_SEC = 5;

export function WaveformCanvas({
  stem,
  height,
  currentTime,
  duration,
  onInstance,
  onSeek,
  className,
  peakVariant,
  label,
}: {
  stem: Stem;
  height: number;
  /** Drives the accessible value; the canvas draws its own cursor. */
  currentTime: number;
  duration: number;
  onInstance: (ws: WaveSurfer | null) => void;
  onSeek: (seconds: number) => void;
  className?: string;
  /** Varies the simulated waveform shape; ignored against a real backend. */
  peakVariant?: number;
  /**
   * Overrides the accessible name. The comparison screen shows two waveforms for
   * the same stem, so "Seek Vocals" twice would leave a screen-reader user unable
   * to tell which version they are scrubbing.
   */
  label?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Attach the seek listener as the instance appears, then hand it to the owner.
  const handleInstance = React.useCallback(
    (ws: WaveSurfer | null) => {
      // `interaction` covers both click and drag-to-seek, and reports the target
      // time — so we never have to convert pixels ourselves.
      ws?.on("interaction", (time: number) => onSeek(time));
      onInstance(ws);
    },
    [onInstance, onSeek],
  );

  const { ready, error } = useWavesurfer({
    stem,
    containerRef,
    height,
    onInstance: handleInstance,
    peakVariant,
  });

  const total = duration || stem.durationSec;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: currentTime - KEY_STEP_SEC,
      ArrowRight: currentTime + KEY_STEP_SEC,
      Home: 0,
      End: total,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    onSeek(Math.min(total, Math.max(0, target)));
  };

  if (error) {
    return (
      <div
        role="status"
        className={cn(
          "text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 text-xs",
          className,
        )}
        style={{ height }}
      >
        <TriangleAlert className="text-failed size-3.5 shrink-0" aria-hidden />
        <span className="truncate">Couldn&apos;t load audio for this track.</span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} style={{ height }}>
      {!ready && (
        <Skeleton className="absolute inset-0 rounded-md" aria-hidden />
      )}
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label={label ?? `Seek ${stem.name}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(total)}`}
        onKeyDown={handleKeyDown}
        className={cn(
          "focus-visible:ring-ring/60 rounded-md outline-none transition-opacity focus-visible:ring-2",
          !ready && "opacity-0",
        )}
      />
    </div>
  );
}
