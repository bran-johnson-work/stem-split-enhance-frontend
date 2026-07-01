import { AudioLines, Check, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Waveform } from "@/components/marketing/waveform";

/**
 * Decorative hero centerpiece: a faux stem-separation player.
 * One source track splits into four animated stem lanes
 * (vocals / drums / bass / master), each drawn with the shared
 * blue->purple `Waveform`. Pure CSS animation — no audio, no image
 * assets — and entirely decorative, so it is hidden from assistive
 * tech. All motion is frozen under `prefers-reduced-motion`.
 */

const lanes = [
  { label: "Vocals", bar: "bg-analyzing", dot: "bg-analyzing", seed: 1 },
  { label: "Drums", bar: "bg-mastering", dot: "bg-mastering", seed: 2.3 },
  { label: "Bass", bar: "bg-separating", dot: "bg-separating", seed: 3.6 },
  { label: "Master", bar: "bg-brand-gradient", dot: "bg-brand", seed: 4.9 },
];

export function StemPlayer() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md">
      {/* brand glow behind the card */}
      <div className="bg-brand-gradient animate-aurora absolute inset-6 -z-10 rounded-full opacity-20 blur-3xl dark:opacity-30" />

      {/* water reflection: a soft ellipse that contracts + fades as the
          card lifts, so the card reads as buoyant rather than sliding */}
      <div className="animate-ripple bg-foreground/25 absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] blur-md dark:bg-black/50" />

      <div className="animate-float bg-card/90 ring-border/60 supports-[backdrop-filter]:bg-card/70 rounded-2xl border p-5 shadow-xl ring-1 backdrop-blur-sm sm:p-6">
        {/* player chrome */}
        <div className="flex items-center gap-3">
          <span className="bg-brand-gradient grid size-10 place-items-center rounded-full text-white shadow-sm">
            <Play className="size-4 translate-x-px fill-current" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-medium">track.wav</p>
            <p className="text-muted-foreground font-mono text-xs">
              44.1 kHz · stereo
            </p>
          </div>
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            02:14
          </span>
        </div>

        {/* stem lanes */}
        <div className="relative mt-5 space-y-3">
          {/* Sweeping playhead — confined to the waveform region only.
              Left inset = label (w-12 = 48px) + gap-3 (12px) = 60px.
              Right inset = dot (size-1.5 = 6px) + gap-3 (12px) = 18px. */}
          <div className="pointer-events-none absolute inset-y-0 left-[60px] right-[18px]">
            <span className="animate-playhead bg-foreground/40 absolute top-0 bottom-0 w-px" />
          </div>

          {lanes.map((lane) => (
            <div key={lane.label} className="flex items-center gap-3">
              <span className="text-muted-foreground w-12 shrink-0 font-mono text-[10px] tracking-wider uppercase">
                {lane.label}
              </span>
              <div className="bg-muted/40 relative h-9 flex-1 overflow-hidden rounded-md px-1.5">
                <Waveform count={64} seed={lane.seed} barClassName={lane.bar} />
              </div>
              <span className={cn("size-1.5 shrink-0 rounded-full", lane.dot)} />
            </div>
          ))}
        </div>

        {/* footer transport */}
        <div className="text-muted-foreground mt-5 flex items-center justify-between border-t pt-4 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <AudioLines className="text-brand size-3.5" />
            4 stems separated
          </span>
          <span className="flex items-center gap-1.5">
            <Pause className="size-3" />
            live preview
          </span>
        </div>
      </div>

      {/* floating proof badges (hidden on the narrowest screens) — each
          bobs on its own period/phase so the composition feels buoyant
          with a touch of parallax against the card */}
      <div
        className="animate-float bg-card absolute -left-3 top-16 hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md sm:flex"
        style={{ animationDuration: "5s", animationDelay: "-1.2s" }}
      >
        <Check className="text-completed size-3.5" />
        Vocals isolated
      </div>
      <div
        className="animate-float bg-card absolute -right-3 bottom-16 hidden items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-medium shadow-md sm:flex"
        style={{ animationDuration: "7s", animationDelay: "-2.6s" }}
      >
        <span className="text-brand">+6 dB</span>
        master
      </div>
    </div>
  );
}
