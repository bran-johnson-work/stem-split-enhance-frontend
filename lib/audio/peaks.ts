// Deterministic pseudo-waveform amplitudes.
//
// Two consumers, one curve:
//   • the marketing site draws these as DOM bars (components/marketing/waveform.tsx)
//   • KN-44 hands them to wavesurfer as pre-computed `peaks`, so a lane renders
//     without fetching or decoding audio
//
// Deterministic so SSR and the client agree, and so a given stem always draws the
// same shape across reloads.

import type { StemKind } from "@/lib/types";

/** Amplitudes in [0, 1]. `seed` varies the curve (and, in the DOM, the motion phase). */
export function waveform(count: number, seed = 1): number[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / count;
    const v =
      0.5 +
      0.3 * Math.sin(t * Math.PI * 6 + seed) +
      0.22 * Math.sin(t * Math.PI * 14 + seed * 1.7) +
      0.16 * Math.sin(t * Math.PI * 29 + seed * 2.5);
    return Math.min(1, Math.max(0.06, v));
  });
}

/** A stable seed per stem, so vocals and drums never draw the same shape. */
const SEED: Record<StemKind, number> = {
  master: 4.9,
  vocals: 1,
  drums: 2.3,
  bass: 3.6,
  other: 5.8,
};

/**
 * Envelope multiplier — real stems aren't uniformly loud end to end. Drums stay
 * punchy throughout; vocals and bass breathe. Purely cosmetic.
 */
const DENSITY: Record<StemKind, number> = {
  master: 1,
  vocals: 0.82,
  drums: 0.95,
  bass: 0.7,
  other: 0.78,
};

/** How many peaks we generate per lane. Enough detail for a full-width canvas. */
const RESOLUTION = 512;

/**
 * Pre-computed peaks for a stem, shaped the way wavesurfer wants them:
 * one channel of floats. Values alternate sign so the canvas renders mirrored
 * about the centre axis, the way decoded audio does — an all-positive channel
 * would draw only the upper half.
 */
export function stemPeaks(kind: StemKind, variant = 0): Float32Array {
  // `variant` nudges the seed so two renders of the same stem draw different
  // shapes. The version-comparison screen needs this: with one curve per kind, the
  // simulated v1 and v2 waveforms would be pixel-identical and the whole screen
  // would look like it wasn't wired up.
  const amps = waveform(RESOLUTION, SEED[kind] + variant * 0.45);
  const density = DENSITY[kind];
  const peaks = new Float32Array(RESOLUTION);
  for (let i = 0; i < RESOLUTION; i++) {
    peaks[i] = amps[i] * density * (i % 2 === 0 ? 1 : -1);
  }
  return peaks;
}
