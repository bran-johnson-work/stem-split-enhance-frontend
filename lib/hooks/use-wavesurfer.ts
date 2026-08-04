"use client";

// One wavesurfer instance's lifecycle, for a single stem lane.
//
// Three things this hook exists to get right:
//
//  • SSR — wavesurfer touches the DOM, so it's imported dynamically *inside* the
//    effect. That keeps it off the server and out of the initial bundle.
//  • Teardown — an unmount mid-load must not leave a live <audio> element behind,
//    so the async import is guarded by a `cancelled` flag and the audio source
//    reference is always released, even if we never got as far as creating an
//    instance.
//  • Theme — canvas paint is not reactive. When the theme flips we repaint via
//    `setOptions` rather than rebuilding the instance, which would reset playback
//    position and drop the lane out of sync with the rest of the mixer.

import * as React from "react";
import { useTheme } from "next-themes";
import type WaveSurfer from "wavesurfer.js";
import { releaseAudioSource, resolveAudioSource } from "@/lib/audio/audio-source";
import { laneColors } from "@/lib/audio/colors";
import type { Stem } from "@/lib/types";

export interface UseWavesurferOptions {
  stem: Stem;
  containerRef: React.RefObject<HTMLDivElement | null>;
  height: number;
  /** Called with the instance once created, and with `null` on teardown. */
  onInstance?: (ws: WaveSurfer | null) => void;
  /** Varies the simulated waveform shape; ignored against a real backend. */
  peakVariant?: number;
}

export interface UseWavesurferResult {
  /** The waveform is drawn and the media can play. */
  ready: boolean;
  /** Human-readable load failure, or null. */
  error: string | null;
}

export function useWavesurfer({
  stem,
  containerRef,
  height,
  onInstance,
  peakVariant = 0,
}: UseWavesurferOptions): UseWavesurferResult {
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const wsRef = React.useRef<WaveSurfer | null>(null);

  // Kept in a ref so a caller's inline callback doesn't retrigger the effect and
  // rebuild the instance on every render.
  const onInstanceRef = React.useRef(onInstance);
  React.useEffect(() => {
    onInstanceRef.current = onInstance;
  });

  const { kind, url, durationSec } = stem;

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    setReady(false);
    setError(null);

    // Taken here, released in cleanup — symmetric even if the import never
    // resolves or the component unmounts first.
    const audioStem = { kind, url, durationSec };
    const source = resolveAudioSource(audioStem, peakVariant);

    void (async () => {
      try {
        const { default: WaveSurferCtor } = await import("wavesurfer.js");
        if (cancelled) return;

        const ws = WaveSurferCtor.create({
          container,
          height,
          ...laneColors(kind),
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          cursorWidth: 2,
          normalize: true,
          dragToSeek: true,
          url: source.url,
          peaks: source.peaks,
          duration: source.duration,
        });

        ws.on("ready", () => !cancelled && setReady(true));
        ws.on("error", (err: Error) => {
          if (cancelled) return;
          setReady(false);
          setError(err?.message ?? "Couldn't load audio.");
        });

        wsRef.current = ws;
        onInstanceRef.current?.(ws);
      } catch {
        if (!cancelled) setError("Couldn't load the audio player.");
      }
    })();

    return () => {
      cancelled = true;
      onInstanceRef.current?.(null);
      wsRef.current?.destroy();
      wsRef.current = null;
      releaseAudioSource(audioStem);
    };
  }, [containerRef, height, kind, url, durationSec, peakVariant]);

  // Repaint on theme change. Deferred a frame because next-themes swaps the class
  // on <html> and updates `resolvedTheme` in the same tick — reading the tokens
  // synchronously can catch the outgoing palette.
  React.useEffect(() => {
    if (!wsRef.current) return;
    const frame = requestAnimationFrame(() => {
      wsRef.current?.setOptions(laneColors(kind));
    });
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme, kind, ready]);

  return { ready, error };
}
