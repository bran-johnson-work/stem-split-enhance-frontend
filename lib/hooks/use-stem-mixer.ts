"use client";

// The delivery mixer: solo/mute over a synced multi-lane transport.
//
// The transport itself (one clock, N lanes, drift correction) lives in
// lib/audio/sync-transport — the version-comparison screen drives the same
// machinery with a different audibility rule. What's specific to this screen is
// the DAW-style solo/mute pair, and that is all this hook adds.
//
// Audibility is derived, never stored per lane: a lane is heard when it isn't
// muted and either nothing is soloed or it is. That keeps solo and mute from
// fighting each other — un-soloing restores whatever mutes were already set.

import * as React from "react";
import type WaveSurfer from "wavesurfer.js";
import { useSyncTransport } from "@/lib/audio/sync-transport";

export interface StemMixer {
  playing: boolean;
  currentTime: number;
  duration: number;
  /** Every lane has loaded and can play. */
  ready: boolean;
  solo: ReadonlySet<string>;
  muted: ReadonlySet<string>;
  /** True when this lane's audio would actually reach the speakers. */
  isAudible: (id: string) => boolean;
  registerLane: (id: string, ws: WaveSurfer | null) => void;
  toggleSolo: (id: string) => void;
  toggleMute: (id: string) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  /** Stop and rewind every lane — used when another transport takes over. */
  stop: () => void;
}

/** A lane is heard unless muted, or unless something else is soloed. */
function audible(
  id: string,
  solo: ReadonlySet<string>,
  muted: ReadonlySet<string>,
) {
  if (muted.has(id)) return false;
  return solo.size === 0 || solo.has(id);
}

export function useStemMixer(laneIds: string[]): StemMixer {
  const [solo, setSolo] = React.useState<ReadonlySet<string>>(new Set());
  const [muted, setMuted] = React.useState<ReadonlySet<string>>(new Set());

  const isAudible = React.useCallback(
    (id: string) => audible(id, solo, muted),
    [solo, muted],
  );

  const transport = useSyncTransport(isAudible);

  const toggleSolo = React.useCallback((id: string) => {
    setSolo((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const toggleMute = React.useCallback((id: string) => {
    setMuted((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  return {
    playing: transport.playing,
    currentTime: transport.currentTime,
    duration: transport.duration,
    ready:
      laneIds.length > 0 &&
      laneIds.every((id) => transport.readyLanes.has(id)),
    solo,
    muted,
    isAudible,
    registerLane: transport.registerLane,
    toggleSolo,
    toggleMute,
    play: transport.play,
    pause: transport.pause,
    toggle: transport.toggle,
    seek: transport.seek,
    stop: transport.stop,
  };
}
