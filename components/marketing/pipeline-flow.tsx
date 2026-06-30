import { Check, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Waveform } from "@/components/marketing/waveform";

/**
 * Animated core-loop diagram: Upload -> Audio Processing -> Download.
 *
 * A raw file streams into a pulsing "engine" core (rotating ring +
 * live equalizer), which emits colour-coded separated stems that
 * stream onward into a download target whose progress ring fills and
 * pings a completion check. Entirely CSS-driven (transform/opacity)
 * and decorative, so the moving parts are hidden from assistive tech;
 * the labels below each node carry the meaning. All motion freezes
 * under `prefers-reduced-motion` (see globals.css).
 */

const CIRC = 2 * Math.PI * 34; // download progress-ring circumference

/** A streaming dot. `color` sets both fill (bg) and glow: the
 *  box-shadow below uses currentColor, so a `text-*` class drives it. */
type Packet = { color: string };

// Raw track heading into the engine.
const inPackets: Packet[] = [
  { color: "bg-brand text-brand" },
  { color: "bg-brand text-brand" },
  { color: "bg-brand text-brand" },
];

// Separated, mastered stems streaming out toward the download.
const outPackets: Packet[] = [
  { color: "bg-analyzing text-analyzing" },
  { color: "bg-separating text-separating" },
  { color: "bg-mastering text-mastering" },
  { color: "bg-completed text-completed" },
];

/** The connecting rail between two nodes, with a stream of packets.
 *  Renders a horizontal variant for the desktop row and a vertical
 *  one for the stacked mobile column. */
function Connector({ packets }: { packets: Packet[] }) {
  const dot =
    "absolute size-2.5 rounded-full shadow-[0_0_12px_2px_currentColor] motion-reduce:hidden";
  return (
    <>
      {/* desktop: horizontal */}
      <div className="relative hidden h-24 flex-1 items-center md:flex">
        <div className="h-px w-full bg-gradient-to-r from-border/30 via-border to-border/30" />
        {packets.map((p, i) => (
          <span
            key={i}
            className={cn(dot, "animate-flow-x top-1/2 -translate-y-1/2", p.color)}
            style={{ animationDelay: `${i * (1.8 / packets.length)}s` }}
          />
        ))}
      </div>
      {/* mobile: vertical */}
      <div className="relative flex h-12 w-2.5 items-center justify-center md:hidden">
        <div className="h-full w-px bg-gradient-to-b from-border/30 via-border to-border/30" />
        {packets.map((p, i) => (
          <span
            key={i}
            className={cn(dot, "animate-flow-y left-1/2 -translate-x-1/2", p.color)}
            style={{ animationDelay: `${i * (1.8 / packets.length)}s` }}
          />
        ))}
      </div>
    </>
  );
}

/** A labelled end node (Upload / Download). */
function Node({
  children,
  title,
  caption,
}: {
  children: React.ReactNode;
  title: string;
  caption: string;
}) {
  return (
    <div className="flex w-32 shrink-0 flex-col items-center gap-4 text-center">
      <div className="flex h-24 items-center">{children}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{caption}</p>
      </div>
    </div>
  );
}

export function PipelineFlow() {
  return (
    <div className="relative mx-auto max-w-4xl">
      {/* soft brand wash behind the rail */}
      <div className="bg-aurora animate-aurora pointer-events-none absolute inset-0 -z-10 opacity-40 blur-2xl" />

      <div
        aria-hidden
        className="flex flex-col items-center justify-between md:flex-row md:items-start"
      >
        {/* Upload */}
        <Node title="Upload" caption="Drop your track in">
          <span className="bg-card relative grid size-20 place-items-center rounded-2xl border shadow-sm">
            <Upload className="text-brand size-8" />
            {/* uploading shimmer */}
            <span className="bg-brand/10 absolute inset-0 -z-10 rounded-2xl blur-md" />
          </span>
        </Node>

        <Connector packets={inPackets} />

        {/* Audio Processing — the engine */}
        <div className="flex w-32 shrink-0 flex-col items-center gap-4 text-center">
          <div className="relative flex h-24 items-center justify-center">
            {/* rotating conic ring (masked to a thin donut) */}
            <span
              className="animate-spin-slow absolute size-24 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, var(--brand) 70deg, transparent 150deg, var(--brand) 250deg, transparent 330deg)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
              }}
            />
            {/* pulsing brand core with a live equalizer waveform */}
            <span className="animate-core bg-brand-gradient relative grid size-[72px] place-items-center overflow-hidden rounded-full text-white">
              <span className="h-7 w-12">
                <Waveform count={18} seed={4} barClassName="bg-white/90" />
              </span>
            </span>
          </div>
          <div>
            <p className="font-semibold">Audio Processing</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Separate · clean · master
            </p>
          </div>
        </div>

        <Connector packets={outPackets} />

        {/* Download */}
        <Node title="Download" caption="Stems + master ready">
          <span className="relative grid size-20 place-items-center">
            <svg
              className="absolute inset-0 size-20 -rotate-90"
              viewBox="0 0 80 80"
              fill="none"
            >
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-border"
                strokeWidth="4"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-brand animate-progress motion-reduce:hidden"
                strokeWidth="4"
                strokeLinecap="round"
                style={
                  {
                    "--circ": `${CIRC}px`,
                    strokeDasharray: `${CIRC}px`,
                  } as React.CSSProperties
                }
              />
            </svg>
            <Download className="text-brand size-8" />
            {/* completion ping */}
            <span className="bg-completed animate-pop absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full text-white shadow-md motion-reduce:hidden">
              <Check className="size-4" strokeWidth={3} />
            </span>
          </span>
        </Node>
      </div>
    </div>
  );
}
