"use client";

// One stem in the mixer: identity, waveform, solo/mute, download.
//
// Solo and mute use the DAW convention (S / M) rather than icons — a speaker
// glyph can't distinguish "this lane is muted" from "this lane is inaudible
// because another is soloed". The lane dims whenever it isn't audible, whichever
// of the two put it there.

import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/delivery/download-button";
import { WaveformCanvas } from "@/components/delivery/waveform-canvas";
import { STEM_META, stemDetails } from "@/lib/delivery/deliverables";
import type { StemMixer } from "@/lib/hooks/use-stem-mixer";
import type { Stem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Waveform height for a stem lane. The master gets more room. */
const LANE_HEIGHT = 40;

export function StemLane({
  stem,
  mixer,
  pending,
  downloadsDisabled,
  onDownload,
}: {
  stem: Stem;
  mixer: StemMixer;
  pending: boolean;
  downloadsDisabled: boolean;
  onDownload: () => void;
}) {
  const meta = STEM_META[stem.kind];
  const Icon = meta.icon;
  const details = stemDetails(stem);

  const soloed = mixer.solo.has(stem.id);
  const muted = mixer.muted.has(stem.id);
  const audible = mixer.isAudible(stem.id);

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg transition-opacity",
            meta.softBg,
            meta.text,
            !audible && "opacity-40",
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </div>

        <div className={cn("min-w-0 flex-1", !audible && "opacity-50")}>
          <p className="truncate text-sm font-medium">{stem.name}</p>
          <p className="text-muted-foreground truncate text-xs tabular-nums">
            {details.join(" · ")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ToggleChip
            label="S"
            active={soloed}
            aria-label={`${soloed ? "Unsolo" : "Solo"} ${stem.name}`}
            onClick={() => mixer.toggleSolo(stem.id)}
          />
          <ToggleChip
            label="M"
            active={muted}
            aria-label={`${muted ? "Unmute" : "Mute"} ${stem.name}`}
            onClick={() => mixer.toggleMute(stem.id)}
          />
        </div>

        <DownloadButton
          stem={stem}
          details={details}
          pending={pending}
          disabled={downloadsDisabled}
          onDownload={onDownload}
        />
      </div>

      <WaveformCanvas
        stem={stem}
        height={LANE_HEIGHT}
        currentTime={mixer.currentTime}
        duration={mixer.duration}
        onInstance={(ws) => mixer.registerLane(stem.id, ws)}
        onSeek={mixer.seek}
        className={cn("mt-2 transition-opacity", !audible && "opacity-40")}
      />
    </li>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
  ...props
}: {
  label: string;
  active: boolean;
  onClick: () => void;
} & React.ComponentProps<"button">) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      onClick={onClick}
      className="size-7 font-mono text-[11px] font-semibold"
      {...props}
    >
      {label}
    </Button>
  );
}
