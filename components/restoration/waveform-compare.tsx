"use client";

// Original / Version 2 / Version 3 as stacked amplitude lanes, on one shared
// scale, with the original ghosted behind each restored lane.
//
// Ported from `waveform_figure` in the pipeline's Streamlit app. Two details
// carry the whole meaning and are easy to lose:
//
//   * **One shared scale.** Every lane is divided by the *original's* peak, not
//     its own. Normalising each lane independently would make a stage that
//     halved the level look identical to one that changed nothing — which is
//     precisely the failure the plot is here to catch.
//   * **The ghost.** Drawing the original behind each result is what turns three
//     pictures into a comparison. Without it you are asked to hold a waveform in
//     your head and diff it by eye against the one two lanes up.
//
// SVG rather than canvas: 260 rects per lane is nothing for the DOM, it scales
// with the container for free, and it needs no repaint-on-theme-change plumbing
// (which the canvas lanes elsewhere in this app do need).

import * as React from "react";
import type { AudioAnalysis, EnvelopeDiff } from "@/lib/audio/analysis";
import { BAR_COUNT, compareToOriginal } from "@/lib/audio/analysis";

export interface WaveformLane {
  key: string;
  label: string;
  analysis: AudioAnalysis;
}

/** Viewbox units. Height is per lane; width is arbitrary since the SVG scales. */
const VIEW_W = 1000;
const VIEW_H = 120;
const PITCH = VIEW_W / BAR_COUNT;
const BAR_W = PITCH * 0.62; // 0.62 duty cycle, as in the Streamlit view

/** The ghost is drawn *wider* than the result bar, and this is the one place the
 *  comparison deliberately diverges from Streamlit.
 *
 *  There, ghost and result share a width and an x, so the original is only visible
 *  where it was louder than the result. That reads well on a track where the
 *  restoration lowered the level — and shows nothing at all on one where it raised
 *  it, which is the common case: the lane then looks like it has no comparison in
 *  it. Widening the ghost makes it peek out on both sides of every bar, so "how
 *  does this differ from the original" is answerable at every point in the track
 *  rather than only where the result happens to be quieter. */
const GHOST_W = PITCH * 0.98;

/** One line saying how far this lane has moved from the original.
 *
 *  Present because the plot alone cannot distinguish "this stage did nothing" from
 *  "this stage changed something too fine to see at 260 bars" — and for V2, which
 *  passes audio through untouched whenever it finds nothing to repair, that is the
 *  single most common question about the run. */
function DiffSummary({ diff }: { diff: EnvelopeDiff }) {
  if (diff.divergencePct < 0.05) {
    return (
      <span className="text-muted-foreground text-xs">
        identical to the original
      </span>
    );
  }
  const parts = [`${diff.divergencePct.toFixed(1)}% different`];
  if (Math.abs(diff.levelDb) >= 0.1) {
    parts.push(`${diff.levelDb > 0 ? "+" : ""}${diff.levelDb.toFixed(1)} dB peak`);
  }
  if (Math.abs(diff.durationDelta) >= 0.05) {
    parts.push(
      `${diff.durationDelta > 0 ? "+" : ""}${diff.durationDelta.toFixed(2)}s length`,
    );
  }
  return <span className="text-muted-foreground text-xs">{parts.join(" · ")}</span>;
}

function Lane({
  lane,
  reference,
  peak,
  showGhost,
  diff,
}: {
  lane: WaveformLane;
  reference: Float32Array;
  peak: number;
  showGhost: boolean;
  diff: EnvelopeDiff | null;
}) {
  const { envelope, durationSeconds } = lane.analysis;
  const ticks = Array.from({ length: 7 }, (_, i) => (i / 6) * durationSeconds);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{lane.label}</span>
        <span className="flex items-baseline gap-3">
          {diff && <DiffSummary diff={diff} />}
          {showGhost && (
            <span className="text-muted-foreground text-xs">dim bars = original</span>
          )}
        </span>
      </div>

      <div className="bg-muted/40 overflow-hidden rounded-md">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="block h-28 w-full"
          role="img"
          aria-label={`${lane.label} waveform`}
        >
          {showGhost &&
            Array.from({ length: BAR_COUNT }, (_, i) => {
              const h = (reference[i] / peak) * VIEW_H;
              return (
                <rect
                  key={`g${i}`}
                  // Centred on the same pitch as the result bar, but wider, so it
                  // shows on both sides instead of only where it is taller.
                  x={i * PITCH - (GHOST_W - BAR_W) / 2}
                  y={(VIEW_H - h) / 2}
                  width={GHOST_W}
                  height={h}
                  // A neutral, not a dim brand tint: the result bars are already
                  // brand-coloured, and the same hue at low opacity reads as "a
                  // faint version of the same thing" rather than "the other one" —
                  // and on a light background it barely reads at all.
                  className="fill-muted-foreground/35"
                />
              );
            })}
          {Array.from({ length: BAR_COUNT }, (_, i) => {
            const h = (envelope[i] / peak) * VIEW_H;
            return (
              <rect
                key={i}
                x={i * PITCH}
                y={(VIEW_H - h) / 2}
                width={BAR_W}
                height={h}
                className="fill-brand"
              />
            );
          })}
        </svg>

        <div className="text-muted-foreground flex justify-between px-1 pb-1 text-[10px] tabular-nums">
          {ticks.map((t, i) => (
            <span key={i}>{Math.round(t)}s</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WaveformCompare({ lanes }: { lanes: WaveformLane[] }) {
  if (lanes.length === 0) return null;

  // The original supplies the ghost; the *loudest* lane supplies the scale.
  //
  // Streamlit divides everything by the original's peak, which clips any stage
  // that came back louder — and "the restoration raised the level" is exactly the
  // kind of thing this plot should show rather than crop. Dividing every lane by
  // one shared constant preserves the comparison either way; taking the maximum
  // just guarantees nothing lands outside the box.
  //
  // A peak of zero (a silent upload) would divide every bar by nothing, so it
  // falls back to 1 and the lanes draw flat — which is the truth.
  const reference = lanes[0].analysis.envelope;
  const peak = Math.max(...lanes.map((l) => l.analysis.peak)) || 1;

  return (
    <div className="space-y-5">
      {lanes.map((lane, index) => (
        <Lane
          key={lane.key}
          lane={lane}
          reference={reference}
          peak={peak}
          showGhost={index > 0}
          diff={index > 0 ? compareToOriginal(lanes[0].analysis, lane.analysis) : null}
        />
      ))}
    </div>
  );
}
