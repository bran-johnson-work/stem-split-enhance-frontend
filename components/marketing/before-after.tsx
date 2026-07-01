"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Waveform } from "@/components/marketing/waveform";
import { cn } from "@/lib/utils";

/**
 * Interactive "muddy mix -> clean, mastered" comparison slider. One
 * waveform is drawn twice, in register: a muddy grey "Before" underneath
 * and the brand-coloured "After" on top, clipped at the divider. Dragging
 * the divider left/right wipes between them. Colours are unchanged from
 * the rest of the site — only the layout/interaction follows the reference.
 *
 * Fully visual/faux — no audio asset required; a real A/B clip can be
 * wired later via the installed `wavesurfer.js`.
 */

const SEED = 2;

export function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const trackRef = useRef<HTMLDivElement>(null);

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setFromClientX(e.clientX);
  };

  const nudge = (delta: number) =>
    setPos((p) => Math.min(100, Math.max(0, p + delta)));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="bg-card relative cursor-ew-resize touch-none overflow-hidden rounded-2xl border shadow-sm select-none"
      >
        {/* labels */}
        <span className="text-muted-foreground absolute top-5 left-5 z-10 font-mono text-xs font-medium tracking-wider uppercase sm:top-6 sm:left-8">
          Before
        </span>
        <span className="text-foreground absolute top-5 right-5 z-10 font-mono text-xs font-medium tracking-wider uppercase sm:top-6 sm:right-8">
          After
        </span>

        {/* waveform stack — one shape, drawn twice and wiped by the divider.
            Fewer bars on mobile so the fixed inter-bar gaps don't overflow the
            narrow track; the dense 150-bar look is kept from sm up. */}
        <div className="flex min-h-[260px] items-center px-6 py-12 sm:px-10">
          <CompareWave count={110} pos={pos} className="sm:hidden" />
          <CompareWave count={240} pos={pos} className="hidden sm:block" />
        </div>

        {/* divider */}
        <div
          className="bg-border/80 pointer-events-none absolute inset-y-0 w-px"
          style={{ left: `${pos}%` }}
        />

        {/* drag handle */}
        <button
          type="button"
          role="slider"
          aria-label="Drag to compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              nudge(-4);
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              nudge(4);
            }
          }}
          style={{ left: `${pos}%` }}
          className="bg-card text-foreground focus-visible:ring-ring absolute top-1/2 z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border shadow-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowLeftRight className="size-5" />
        </button>
      </div>

      <p className="text-muted-foreground mt-4 text-center text-sm text-pretty">
        Drag the divider to compare the original mix with the separated, mastered
        result.
      </p>
    </div>
  );
}

/**
 * The muddy "Before" waveform with the mastered "After" layered on top and
 * clipped at the divider. Rendered at different bar counts per breakpoint.
 */
function CompareWave({
  count,
  pos,
  className,
}: {
  count: number;
  pos: number;
  className?: string;
}) {
  return (
    <div className={cn("relative h-28 w-full", className)}>
      {/* BEFORE — muddy grey mix (full width, underneath) */}
      <div className="absolute inset-0">
        <Waveform
          count={count}
          seed={SEED}
          className="gap-px"
          barClassName="bg-muted-foreground/40"
        />
      </div>
      {/* AFTER — mastered, same shape, revealed right of the divider */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      >
        <Waveform
          count={count}
          seed={SEED}
          className="gap-px"
          barClassName="bg-brand-gradient"
        />
      </div>
    </div>
  );
}
