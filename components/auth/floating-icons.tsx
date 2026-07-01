import {
  AudioLines,
  AudioWaveform,
  Disc2,
  Disc3,
  Drum,
  Guitar,
  Headphones,
  Mic,
  Mic2,
  Music,
  Music2,
  Music3,
  Music4,
  Piano,
  Radio,
  Speaker,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

type Floater = {
  Icon: LucideIcon;
  /** Anchor position (top-left of the icon) as panel-relative %. */
  top: string;
  left: string;
  /** Glyph size in px. */
  size: number;
  /** Static tilt (deg) so icons don't all stand upright. */
  rot: number;
  /** Icon opacity (0–1). */
  opacity: number;
  /** Base drift period (s) — varied so icons wander out of sync. */
  dur: number;
};

/**
 * Decorative music icons scattered across the auth brand panel. Bare,
 * translucent, randomly tilted glyphs that roam the full panel — up, down,
 * sideways and diagonally — via the `animate-drift` utility (GPU
 * transform-only; frozen under prefers-reduced-motion). Each glyph wanders
 * through three per-icon waypoints (see `driftPath`) before easing back to its
 * anchor. The drift lives on a wrapper so each icon keeps its own static
 * rotation. Positions/timings/paths are derived deterministically from the
 * icon index so SSR and client render identically. Non-interactive backdrop —
 * layout owns z-index.
 */
const FLOATERS: Floater[] = [
  { Icon: Music, top: "8%", left: "9%", size: 22, rot: -18, opacity: 0.3, dur: 9 },
  { Icon: Guitar, top: "62%", left: "6%", size: 26, rot: 12, opacity: 0.22, dur: 11 },
  { Icon: Piano, top: "38%", left: "28%", size: 18, rot: -8, opacity: 0.28, dur: 8 },
  { Icon: Drum, top: "82%", left: "22%", size: 24, rot: 24, opacity: 0.2, dur: 10 },
  { Icon: Radio, top: "16%", left: "44%", size: 16, rot: -30, opacity: 0.34, dur: 12.5 },
  { Icon: Headphones, top: "52%", left: "50%", size: 22, rot: 15, opacity: 0.24, dur: 9.5 },
  { Icon: AudioLines, top: "6%", left: "64%", size: 18, rot: -12, opacity: 0.32, dur: 10.5 },
  { Icon: Disc3, top: "70%", left: "60%", size: 26, rot: 36, opacity: 0.2, dur: 11.5 },
  { Icon: Music2, top: "30%", left: "70%", size: 16, rot: 20, opacity: 0.36, dur: 8.5 },
  { Icon: Mic, top: "46%", left: "16%", size: 18, rot: -22, opacity: 0.3, dur: 12 },
  { Icon: Music3, top: "24%", left: "18%", size: 14, rot: 28, opacity: 0.26, dur: 9.2 },
  { Icon: AudioWaveform, top: "90%", left: "40%", size: 20, rot: -16, opacity: 0.24, dur: 10.8 },
  { Icon: Disc2, top: "12%", left: "32%", size: 16, rot: 42, opacity: 0.22, dur: 11.8 },
  { Icon: Volume2, top: "58%", left: "34%", size: 18, rot: -34, opacity: 0.28, dur: 8.8 },
  { Icon: Mic2, top: "76%", left: "10%", size: 16, rot: 18, opacity: 0.3, dur: 12.2 },
  { Icon: Music4, top: "40%", left: "58%", size: 14, rot: -26, opacity: 0.34, dur: 9.8 },
  { Icon: Speaker, top: "86%", left: "66%", size: 18, rot: 10, opacity: 0.22, dur: 11.2 },
  { Icon: Piano, top: "20%", left: "56%", size: 16, rot: -40, opacity: 0.26, dur: 10.2 },
  { Icon: Music, top: "68%", left: "44%", size: 14, rot: 32, opacity: 0.3, dur: 8.6 },
  { Icon: Headphones, top: "4%", left: "48%", size: 16, rot: -14, opacity: 0.24, dur: 12.8 },
  { Icon: AudioLines, top: "48%", left: "4%", size: 14, rot: 22, opacity: 0.28, dur: 9.4 },
  { Icon: Guitar, top: "34%", left: "42%", size: 18, rot: -20, opacity: 0.2, dur: 11.6 },
];

/** Horizontal / vertical reach of a waypoint, in vw / vh. The desktop brand
 *  panel is ~50vw wide and full-height, so these spans let icons cross most of
 *  it while `overflow-hidden` clips anything that wanders past an edge. */
const H_REACH = 22;
const V_REACH = 40;

/** Tiny deterministic PRNG (mulberry32) so the wander paths are stable between
 *  server and client renders — Math.random() would cause hydration mismatches. */
function seededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three waypoints (in vw/vh) picked at random angles and a decent minimum
 *  distance from the anchor, so every icon genuinely travels in some
 *  direction — never a stationary jitter. Fed to the `kn-drift` keyframe via
 *  CSS vars. Rounded to keep the emitted style strings identical across
 *  renders. */
function driftPath(seed: number): CSSProperties {
  const rand = seededRandom(seed);
  const vars: Record<string, string> = {};
  for (let k = 1; k <= 3; k++) {
    const angle = rand() * Math.PI * 2;
    const mag = 0.45 + rand() * 0.55; // 45%–100% of the reach
    vars[`--kx${k}`] = `${(Math.cos(angle) * mag * H_REACH).toFixed(1)}vw`;
    vars[`--ky${k}`] = `${(Math.sin(angle) * mag * V_REACH).toFixed(1)}vh`;
  }
  return vars as CSSProperties;
}

export function FloatingIcons({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {FLOATERS.map(({ Icon, top, left, size, rot, opacity, dur }, i) => {
        const rand = seededRandom(i * 97 + 13);
        // Stretch the base period so a full-panel traversal stays calm, and
        // start each icon at a random phase (negative delay) so the swarm is
        // already spread across its paths on first paint.
        const period = dur * 2.6;
        return (
          <div key={i} className="absolute" style={{ top, left }}>
            <div
              className="animate-drift"
              style={{
                ...driftPath(i * 31 + 7),
                animationDuration: `${period.toFixed(1)}s`,
                animationDelay: `${(-rand() * period).toFixed(1)}s`,
              }}
            >
              <Icon
                size={size}
                strokeWidth={1.5}
                className="text-white"
                style={{ opacity, transform: `rotate(${rot}deg)` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
