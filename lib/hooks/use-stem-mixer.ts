"use client";

// The conductor: one transport driving N stem lanes in lockstep.
//
// Each lane owns its own wavesurfer instance (and therefore its own <audio>
// element), which is what makes independent solo/mute possible. The cost is that
// N media elements are N independent clocks, so this hook:
//
//   • fans play/pause/seek out to every lane
//   • designates one lane the *leader* and reports its clock as the mixer's
//   • periodically nudges any lane that has drifted from the leader
//
// Audibility is derived, never stored per-lane: a lane is heard when it isn't
// muted and either nothing is soloed or it is. That keeps solo and mute from
// fighting each other — un-soloing restores whatever mutes were already set.
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
  const lanes = React.useRef(new Map<string, WaveSurfer>());

  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  // A set, not a counter: a lane that re-registers (or unmounts before it ever
  // fired `ready`) must not corrupt the tally.
  const [readyLanes, setReadyLanes] = React.useState<ReadonlySet<string>>(
    new Set(),
  );
  const [solo, setSolo] = React.useState<ReadonlySet<string>>(new Set());
  const [muted, setMuted] = React.useState<ReadonlySet<string>>(new Set());

  // The first registered lane drives the clock. Every lane holds the same audio
  // duration, so any of them is a valid leader.
  const leaderId = React.useRef<string | null>(null);

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

  // Push derived audibility down to the media elements whenever solo/mute change.
  React.useEffect(() => {
    lanes.current.forEach((ws, id) => ws.setMuted(!audible(id, solo, muted)));
  }, [solo, muted]);

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

  const isAudible = React.useCallback(
    (id: string) => audible(id, solo, muted),
    [solo, muted],
  );

  return {
    playing,
    currentTime,
    duration,
    ready: laneIds.length > 0 && laneIds.every((id) => readyLanes.has(id)),
    solo,
    muted,
    isAudible,
    registerLane,
    toggleSolo,
    toggleMute,
    play,
    pause,
    toggle,
    seek,
    stop,
  };
}
