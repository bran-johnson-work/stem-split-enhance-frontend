"use client";

// The A/B transport: one stem, both engine versions, playing on one clock, one of
// them audible.
//
// This is the whole point of the feature and the one thing it must get right. Both
// versions play at all times; switching only moves mute flags. A switch that stopped
// one player and started the other would cost a reload and lose position, and a
// listener who has to re-find the chorus after every switch cannot judge a small
// difference in vocal bleed — which is exactly what they are being asked to judge.
//
// Scoped to one stem at a time by design. Mounting every stem of both versions would
// be 2N media elements (18 for a full separation) for a question that is always
// about one instrument: "is the vocal cleaner here or here?". Two lanes keeps the
// page light and the comparison pointed at something answerable.
//
// Lane ids are `"<version>:<stemName>"`. `laneId` is the only place that encoding is
// built, and `versionOfLane` the only place it is read back.

import * as React from "react";
import type WaveSurfer from "wavesurfer.js";
import { useSyncTransport } from "@/lib/audio/sync-transport";
import type { EngineVersion } from "@/lib/types";

/** The lane id for one version's take on one stem. */
export function laneId(version: EngineVersion, stemName: string): string {
  return `${version}:${stemName}`;
}

function versionOfLane(id: string): string {
  return id.slice(0, id.indexOf(":"));
}

export interface AbCompare {
  playing: boolean;
  currentTime: number;
  duration: number;
  /** Both lanes have loaded and can play. */
  ready: boolean;
  /** The version currently reaching the speakers. */
  active: EngineVersion;
  isAudible: (id: string) => boolean;
  registerLane: (id: string, ws: WaveSurfer | null) => void;
  /** Flip which version is audible. Instant: nothing reloads, position is kept. */
  setActive: (version: EngineVersion) => void;
  /** Switch to the other version — the big toggle and the keyboard shortcut. */
  toggleActive: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
}

export function useAbCompare({
  versions,
  laneIds,
}: {
  /** The versions being compared, in display order. */
  versions: EngineVersion[];
  /** The lanes expected to load, from `laneId(...)`. Drives `ready`. */
  laneIds: string[];
}): AbCompare {
  const [preferred, setActive] = React.useState<EngineVersion>(
    versions[0] ?? "v1",
  );

  // Derived, not corrected in an effect. If the preferred version leaves the set —
  // its job failed and the screen re-rendered with that side gone — falling back
  // during render avoids a frame where every lane is muted and the transport looks
  // broken, which a setState-in-effect fix would have produced.
  const active =
    versions.length > 0 && !versions.includes(preferred)
      ? versions[0]
      : preferred;

  const isAudible = React.useCallback(
    (id: string) => versionOfLane(id) === active,
    [active],
  );

  const transport = useSyncTransport(isAudible);

  // Steps from `active` (the derived value), not from the raw stored one, so a
  // toggle after a fallback advances from what the user is actually hearing.
  const toggleActive = React.useCallback(() => {
    const index = versions.indexOf(active);
    if (index === -1) {
      if (versions.length > 0) setActive(versions[0]);
      return;
    }
    setActive(versions[(index + 1) % versions.length]);
  }, [versions, active]);

  return {
    playing: transport.playing,
    currentTime: transport.currentTime,
    duration: transport.duration,
    ready:
      laneIds.length > 0 && laneIds.every((id) => transport.readyLanes.has(id)),
    active,
    isAudible,
    registerLane: transport.registerLane,
    setActive,
    toggleActive,
    play: transport.play,
    pause: transport.pause,
    toggle: transport.toggle,
    seek: transport.seek,
    stop: transport.stop,
  };
}
