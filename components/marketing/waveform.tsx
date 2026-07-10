import { waveform } from "@/lib/audio/peaks";
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
 *
 * The amplitude curve lives in lib/audio/peaks.ts, where the KN-44 player also
 * draws on it to render a lane without decoding audio.
 */

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
