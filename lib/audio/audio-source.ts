// AudioSource seam. The player components (components/delivery) are written
// against this contract and never know *where* a lane's audio comes from — real
// bytes from the backend, or a silent stand-in with pre-computed peaks.
//
// Mirrors the `Uploader` seam (lib/upload/upload-file.ts) and the `Downloader`
// seam (lib/download/download-file.ts): one env-gated swap point, real behaviour
// on both sides of it.
//
// The two branches call *identical* wavesurfer APIs. Passing `peaks` + `duration`
// alongside a URL makes wavesurfer skip fetching and decoding the audio and set
// the media source directly, so the simulated lane still has a genuine transport
// (play/pause/seek/timeupdate) — it just plays silence. When the backend lands,
// delete the simulated branch; no component changes.

import { stemPeaks } from "@/lib/audio/peaks";
import { acquireSilentAudio, releaseSilentAudio } from "@/lib/audio/silent-media";
import { USE_REAL_BACKEND } from "@/lib/config";
import type { Stem } from "@/lib/types";

export interface AudioSource {
  /** What the media element loads. */
  url: string;
  /**
   * Pre-computed peaks. Present only when we're *not* decoding real audio —
   * supplying them tells wavesurfer to skip the fetch/decode entirely.
   */
  peaks?: Float32Array[];
  /** Known upfront when peaks are supplied, since nothing decodes to discover it. */
  duration?: number;
}

/** All a stem needs to expose to be playable. */
export type AudioStem = Pick<Stem, "kind" | "url" | "durationSec">;

/** True when lanes play synthesized silence because no backend is configured. */
export const IS_SIMULATED_AUDIO = !USE_REAL_BACKEND;

/**
 * Resolve a stem to something wavesurfer can load. Takes a reference to the
 * shared silent track on the simulated path — pair every call with `releaseAudioSource`.
 *
 * `peakVariant` only matters on the simulated path, where it varies the drawn
 * shape. Two renders of the same stem — the v1 and v2 takes on the comparison
 * screen — otherwise draw identical curves and the screen looks unwired.
 */
export function resolveAudioSource(
  stem: AudioStem,
  peakVariant = 0,
): AudioSource {
  if (USE_REAL_BACKEND) return { url: stem.url };
  return {
    url: acquireSilentAudio(stem.durationSec),
    peaks: [stemPeaks(stem.kind, peakVariant)],
    duration: stem.durationSec,
  };
}

/** Release what `resolveAudioSource` took. A no-op against a real backend. */
export function releaseAudioSource(stem: AudioStem): void {
  if (USE_REAL_BACKEND) return;
  releaseSilentAudio(stem.durationSec);
}
