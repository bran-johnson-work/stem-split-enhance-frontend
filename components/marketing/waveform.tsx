import { cn } from "@/lib/utils";

/**
 * Shared audio-waveform primitive used across the marketing site.
 *
 * Renders many thin vertical bars mirrored about a horizontal centre
 * axis (so they read as real audio). Colour is supplied per-instance
 * via `barClassName`, so callers keep their own palette. Amplitudes are
 * deterministic so SSR and the client render identical markup. Motion
 * (optional) reuses the global `animate-eq` utility and freezes under
 * `prefers-reduced-motion`.
 */

/** Deterministic pseudo-waveform amplitudes in [0, 1]. */
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

export function Waveform({
  count = 64,
  seed = 1,
  animated = true,
  barClassName,
  className,
}: {
  /** Number of bars — more bars read as thinner. */
  count?: number;
  /** Varies the amplitude curve + motion phase. */
  seed?: number;
  /** Pulse the bars (vs. a static waveform). */
  animated?: boolean;
  /** Per-bar colour (+ any extra classes), e.g. "bg-analyzing". */
  barClassName?: string;
  className?: string;
}) {
  const amps = waveform(count, seed);
  return (
    <div
      aria-hidden
      className={cn("flex h-full w-full items-center gap-[2px]", className)}
    >
      {amps.map((h, i) => (
        <span
          key={i}
          className={cn(
            "min-w-px flex-1 rounded-full",
            animated && "animate-eq",
            barClassName,
          )}
          style={{
            height: `${Math.round(h * 100)}%`,
            animationDelay: animated ? `${i * 22 + seed * 80}ms` : undefined,
            animationDuration: animated ? `${1000 + (i % 5) * 120}ms` : undefined,
          }}
        />
      ))}
    </div>
  );
}
