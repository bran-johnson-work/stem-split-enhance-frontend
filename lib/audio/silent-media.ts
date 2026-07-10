// Silent media for the no-backend path.
//
// A waveform player needs a real media element to have a real transport: play,
// pause, seek, `timeupdate` and duration all come from the browser, not from us.
// With no backend the fixture stem URLs (`/mock/<id>/vocals.wav`) 404, so instead
// of faking a clock — and writing transport code that gets thrown away the moment
// Dakota's backend lands — we synthesize a silent WAV of the right duration and
// let wavesurfer drive it exactly as it would drive real audio.
//
// The lane still *looks* right because we hand wavesurfer pre-computed peaks
// (lib/audio/peaks.ts) alongside this URL, which also makes it skip decoding.
//
// It plays silence by design. See lib/audio/audio-source.ts for the seam.

/** 8 kHz is the lowest rate browsers reliably accept in an <audio> element. */
const SAMPLE_RATE = 8000;
/** 8-bit unsigned PCM. Silence is 128 (the midpoint), not 0. */
const SILENCE = 128;
const HEADER_BYTES = 44;

/** Build a mono 8-bit PCM WAV containing `seconds` of silence. */
function silentWav(seconds: number): Blob {
  const dataBytes = Math.max(1, Math.ceil(seconds * SAMPLE_RATE));
  const buffer = new ArrayBuffer(HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true); // chunk size
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header length
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, 1, true); // channels: mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE, true); // byte rate = rate * channels * bytesPerSample
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);

  new Uint8Array(buffer, HEADER_BYTES).fill(SILENCE);
  return new Blob([buffer], { type: "audio/wav" });
}

interface Entry {
  url: string;
  refs: number;
}

/**
 * One blob per distinct duration, shared across every lane of a project — all
 * five stems of a 3:32 track reference the same ~1.7 MB object rather than five
 * copies of it.
 */
const cache = new Map<number, Entry>();

/** Duration is the cache key, so don't let float noise mint duplicate blobs. */
const key = (seconds: number) => Math.round(seconds);

/** Take a reference to the silent track for `seconds`, creating it if needed. */
export function acquireSilentAudio(seconds: number): string {
  const k = key(seconds);
  const existing = cache.get(k);
  if (existing) {
    existing.refs++;
    return existing.url;
  }
  const url = URL.createObjectURL(silentWav(k));
  cache.set(k, { url, refs: 1 });
  return url;
}

/** Drop a reference; the blob is revoked once nothing points at it. */
export function releaseSilentAudio(seconds: number): void {
  const k = key(seconds);
  const entry = cache.get(k);
  if (!entry) return;
  if (--entry.refs <= 0) {
    URL.revokeObjectURL(entry.url);
    cache.delete(k);
  }
}
