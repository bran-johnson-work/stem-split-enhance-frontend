// Canvas colors for the stem lanes.
//
// wavesurfer paints into a <canvas>, so `waveColor`/`progressColor` must be real
// color values — a Tailwind class or a raw `var(--brand)` string means nothing to
// `ctx.fillStyle`. We therefore resolve the design tokens off the document at
// mount time.
//
// The tokens flip between light and dark (app/globals.css), and canvas paint is
// not reactive: nothing repaints a canvas when a CSS variable changes. Callers
// must re-read these and re-render when the resolved theme changes — see
// lib/hooks/use-wavesurfer.ts, which keys its effect on `resolvedTheme`.
//
// Lane colors mirror STEM_META (lib/delivery/deliverables.ts), which in turn
// mirrors the marketing hero's stem lanes.

import type { StemKind } from "@/lib/types";

/** The CSS custom property each stem draws its progress color from. */
const TOKEN: Record<StemKind, string> = {
  master: "--brand",
  vocals: "--state-analyzing",
  drums: "--state-mastering",
  bass: "--state-separating",
  other: "--state-cleaning",
};

/** Used when a token is missing (e.g. resolved before styles apply). */
const FALLBACK = "#71717a";

/** Opacity of the unplayed portion of the waveform, as an 8-bit hex suffix. */
const UNPLAYED_ALPHA = "59"; // ~35%

function readToken(name: string): string {
  if (typeof window === "undefined") return FALLBACK;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || FALLBACK;
}

export interface LaneColors {
  waveColor: string;
  progressColor: string;
  cursorColor: string;
}

/**
 * Resolve the three canvas colors for a stem. Call from the client, after mount,
 * and again whenever the theme changes.
 *
 * The unplayed waveform is a dimmed neutral and the played portion is the stem's
 * own color, so progress reads as the lane "filling in" with its identity.
 */
export function laneColors(kind: StemKind): LaneColors {
  const muted = readToken("--muted-foreground");
  return {
    // Tokens are 6-digit hex (app/globals.css), so an alpha suffix is safe here.
    waveColor: `${muted}${UNPLAYED_ALPHA}`,
    progressColor: readToken(TOKEN[kind]),
    cursorColor: readToken("--foreground"),
  };
}
