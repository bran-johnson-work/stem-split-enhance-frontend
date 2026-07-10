"use client";

// The enhanced master — the thing most people actually came for.
//
// It plays *exclusively*, never alongside the stem bus. The master is the sum of
// the stems, so playing both would double the mix and misrepresent the result.
// Starting it yields the floor from the mixer, and vice versa.

import * as React from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import type WaveSurfer from "wavesurfer.js";
import { DownloadButton } from "@/components/delivery/download-button";
import { WaveformCanvas } from "@/components/delivery/waveform-canvas";
import { Button } from "@/components/ui/button";
import { STEM_META, stemDetails } from "@/lib/delivery/deliverables";
import { formatDuration } from "@/lib/format";
import type { Stem } from "@/lib/types";

/** Taller than a stem lane — this waveform is the hero. */
const MASTER_HEIGHT = 56;

export function MasterPlayer({
  stem,
  suspended,
  onActivate,
  pending,
  downloadsDisabled,
  onDownload,
}: {
  stem: Stem;
  /** The stem mixer has the floor; yield to it. */
  suspended: boolean;
  /** Claim the floor before starting playback. */
  onActivate: () => void;
  pending: boolean;
  downloadsDisabled: boolean;
  onDownload: () => void;
}) {
  const meta = STEM_META.master;
  const Icon = meta.icon;
  const details = stemDetails(stem);

  const wsRef = React.useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  const handleInstance = React.useCallback((ws: WaveSurfer | null) => {
    wsRef.current = ws;
    if (!ws) {
      setPlaying(false);
      setReady(false);
      return;
    }
    ws.on("ready", () => {
      setReady(true);
      setDuration(ws.getDuration());
    });
    ws.on("timeupdate", setCurrentTime);
    ws.on("play", () => setPlaying(true));
    ws.on("pause", () => setPlaying(false));
    ws.on("finish", () => setPlaying(false));
  }, []);

  React.useEffect(() => {
    if (suspended && playing) wsRef.current?.pause();
  }, [suspended, playing]);

  const handleToggle = () => {
    if (!playing) onActivate();
    void wsRef.current?.playPause();
  };

  const handleSeek = React.useCallback((seconds: number) => {
    wsRef.current?.setTime(seconds);
    setCurrentTime(seconds);
  }, []);

  const total = duration || stem.durationSec;

  return (
    <div className="bg-brand/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          onClick={handleToggle}
          disabled={!ready}
          aria-label={playing ? "Pause enhanced master" : "Play enhanced master"}
          className="size-10 shrink-0 rounded-full"
        >
          {!ready ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : playing ? (
            <Pause className="fill-current" aria-hidden />
          ) : (
            <Play className="translate-x-px fill-current" aria-hidden />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            <Icon className={`size-4 shrink-0 ${meta.text}`} aria-hidden />
            {stem.name}
          </p>
          <p className="text-muted-foreground truncate font-mono text-xs tabular-nums">
            {formatDuration(currentTime)} / {formatDuration(total)}
            <span className="hidden font-sans sm:inline">
              {" "}
              · {details.join(" · ")}
            </span>
          </p>
        </div>

        <DownloadButton
          stem={stem}
          details={details}
          pending={pending}
          disabled={downloadsDisabled}
          emphasized
          onDownload={onDownload}
        />
      </div>

      <WaveformCanvas
        stem={stem}
        height={MASTER_HEIGHT}
        currentTime={currentTime}
        duration={total}
        onInstance={handleInstance}
        onSeek={handleSeek}
        className="mt-2"
      />
    </div>
  );
}
