"use client";

// The stem bus: one transport, N lanes, playing in sync.
//
// The separation is the product, so this is where a user checks the work — start
// the bus, solo the vocals, hear whether the drums bled through. Every lane
// shares this transport; seeking any waveform scrubs all of them.

import * as React from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import { StemLane } from "@/components/delivery/stem-lane";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import type { StemMixer as Mixer } from "@/lib/hooks/use-stem-mixer";
import type { Stem } from "@/lib/types";

export function StemMixer({
  stems,
  mixer,
  suspended,
  onActivate,
  pendingId,
  downloadsDisabled,
  onDownload,
}: {
  stems: Stem[];
  mixer: Mixer;
  /** The master player has the floor; yield to it. */
  suspended: boolean;
  /** Claim the floor before starting playback. */
  onActivate: () => void;
  pendingId: string | null;
  downloadsDisabled: boolean;
  onDownload: (stem: Stem) => void;
}) {
  const { playing, pause } = mixer;

  // Exclusivity is enforced here rather than in the panel so the mixer stays the
  // only thing that touches its own transport.
  React.useEffect(() => {
    if (suspended && playing) pause();
  }, [suspended, playing, pause]);

  const handleToggle = () => {
    if (!playing) onActivate();
    mixer.toggle();
  };

  // Before any lane reports in, fall back to the duration the API gave us so the
  // readout doesn't flash "0:00 / 0:00".
  const total = mixer.duration || stems[0]?.durationSec || 0;

  return (
    <div>
      <div className="bg-muted/30 flex items-center gap-3 border-t px-4 py-3">
        <Button
          type="button"
          size="icon"
          onClick={handleToggle}
          disabled={!mixer.ready}
          aria-label={playing ? "Pause all stems" : "Play all stems"}
          className="size-9 rounded-full"
        >
          {!mixer.ready ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : playing ? (
            <Pause className="fill-current" aria-hidden />
          ) : (
            <Play className="translate-x-px fill-current" aria-hidden />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {stems.length} stems
            <span className="text-muted-foreground font-normal">
              {" "}
              · playing together
            </span>
          </p>
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            {formatDuration(mixer.currentTime)} / {formatDuration(total)}
          </p>
        </div>
      </div>

      <ul className="divide-y border-t">
        {stems.map((stem) => (
          <StemLane
            key={stem.id}
            stem={stem}
            mixer={mixer}
            pending={pendingId === stem.id}
            downloadsDisabled={downloadsDisabled && pendingId !== stem.id}
            onDownload={() => onDownload(stem)}
          />
        ))}
      </ul>
    </div>
  );
}
