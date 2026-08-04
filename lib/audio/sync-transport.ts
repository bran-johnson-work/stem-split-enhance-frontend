"use client";

// One transport driving N wavesurfer lanes in lockstep.
//
// Each lane owns its own wavesurfer instance (and therefore its own <audio>
// element), which is what makes per-lane muting possible at all. The cost is that
// N media elements are N independent clocks, so this hook:
//
//   • fans play/pause/seek out to every lane
//   • designates one lane the *leader* and reports its clock as the transport's
//   • periodically nudges any lane that has drifted from the leader
//
// What it deliberately does not own is *which lanes are audible*. That rule differs
// per screen — the delivery mixer derives it from solo/mute sets, the version
// comparison derives it from which engine version holds the floor — so callers pass
// an `isAudible` predicate and this hook pushes the result down to the media
// elements. Audibility is never stored per lane; storing it would let two sources of
// truth disagree.
//
// Upgrade path: routing every lane through one WebAudio context (a single
// AudioContext clock + a GainNode per lane) removes drift entirely and makes the
// resync below unnecessary. Deferred — it also means decoding whole stems into
// memory, which the MediaElement backend avoids.

import * as React from "react";
import type WaveSurfer from "wavesurfer.js";

/** Lanes further than this from the leader get snapped back. */
const MAX_DRIFT_SEC = 0.08;
/** How often we check for drift while playing. */
const DRIFT_CHECK_MS = 2000;

export interface SyncTransport {
  playing: boolean;
  currentTime: number;
  duration: number;
  /** Lanes that have loaded and can play. Callers decide what "all ready" means. */
  readyLanes: ReadonlySet<string>;
  registerLane: (id: string, ws: WaveSurfer | null) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  /** Stop and rewind every lane — used when another transport takes over. */
  stop: () => void;
}

export function useSyncTransport(
  isAudible: (id: string) => boolean,
): SyncTransport {
  const lanes = React.useRef(new Map<string, WaveSurfer>());

  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  // A set, not a counter: a lane that re-registers (or unmounts before it ever
  // fired `ready`) must not corrupt the tally.
  const [readyLanes, setReadyLanes] = React.useState<ReadonlySet<string>>(
    new Set(),
  );

  // The first registered lane drives the clock. Every lane holds the same audio
  // duration, so any of them is a valid leader.
  const leaderId = React.useRef<string | null>(null);

  // Held in a ref so `registerLane` can stay identity-stable while still applying
  // the *current* rule to a lane that registers late — a lane appearing after the
  // user soloed something, or after they switched version, must come in muted
  // rather than blaring until the next audibility change.
  const isAudibleRef = React.useRef(isAudible);
  React.useEffect(() => {
    isAudibleRef.current = isAudible;
  });

  const registerLane = React.useCallback((id: string, ws: WaveSurfer | null) => {
    if (!ws) {
      lanes.current.delete(id);
      setReadyLanes((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (leaderId.current === id) {
        leaderId.current = lanes.current.keys().next().value ?? null;
      }
      return;
    }

    lanes.current.set(id, ws);
    leaderId.current ??= id;
    ws.setMuted(!isAudibleRef.current(id));

    ws.on("ready", () => {
      setReadyLanes((prev) => new Set(prev).add(id));
      if (leaderId.current === id) setDuration(ws.getDuration());
    });
    // Only the leader reports position, so N lanes don't fight over one state.
    ws.on("timeupdate", (time: number) => {
      if (leaderId.current === id) setCurrentTime(time);
    });
    ws.on("finish", () => {
      if (leaderId.current === id) setPlaying(false);
    });
  }, []);

  const play = React.useCallback(() => {
    const leader = leaderId.current
      ? lanes.current.get(leaderId.current)
      : undefined;
    // Align every lane to the leader before starting, so a lane that was seeked
    // or stalled doesn't come in offset.
    const from = leader?.getCurrentTime() ?? 0;
    lanes.current.forEach((ws) => {
      ws.setTime(from);
      void ws.play();
    });
    setPlaying(true);
  }, []);

  const pause = React.useCallback(() => {
    lanes.current.forEach((ws) => ws.pause());
    setPlaying(false);
  }, []);

  // Reads `playing` rather than mutating inside a setState updater — updaters are
  // double-invoked under StrictMode and must stay pure.
  const toggle = React.useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, play, pause]);

  const seek = React.useCallback((seconds: number) => {
    lanes.current.forEach((ws) => ws.setTime(seconds));
    setCurrentTime(seconds);
  }, []);

  const stop = React.useCallback(() => {
    lanes.current.forEach((ws) => {
      ws.pause();
      ws.setTime(0);
    });
    setPlaying(false);
    setCurrentTime(0);
  }, []);

  // Push derived audibility down to the media elements whenever the rule changes.
  // This is the whole mechanism behind an instant A/B switch: both versions keep
  // playing on the same clock and only the mute flags move, so the swap costs
  // nothing and cannot lose position.
  React.useEffect(() => {
    lanes.current.forEach((ws, id) => ws.setMuted(!isAudible(id)));
  }, [isAudible]);

  // Independent <audio> clocks slide apart over minutes. Snap the stragglers back
  // to the leader rather than restarting them, which would be audible.
  React.useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const leader = leaderId.current
        ? lanes.current.get(leaderId.current)
        : undefined;
      if (!leader) return;
      const reference = leader.getCurrentTime();
      lanes.current.forEach((ws, id) => {
        if (id === leaderId.current) return;
        if (Math.abs(ws.getCurrentTime() - reference) > MAX_DRIFT_SEC) {
          ws.setTime(reference);
        }
      });
    }, DRIFT_CHECK_MS);
    return () => clearInterval(timer);
  }, [playing]);

  return {
    playing,
    currentTime,
    duration,
    readyLanes,
    registerLane,
    play,
    pause,
    toggle,
    seek,
    stop,
  };
}
