"use client";

// Decode real audio in the browser and reduce it to the two things the
// restoration comparison draws: an amplitude envelope and an average spectrum.
//
// This mirrors `waveform_figure` / `spectrum_figure` in the pipeline's own
// Streamlit app (merged_app.py), which is the reference for what a human reading
// a restoration needs to see. The metrics cards already say what each stage
// *decided*; these two plots are the only way to see what it actually did to the
// signal — a bandwidth extension that added nothing and one that rebuilt 5kHz of
// high end report the same "step ran".
//
// Why client-side rather than computed by the API: the outputs are already in S3
// behind signed URLs the browser can fetch (the bucket allows GET), and the
// original never leaves the user's machine at all. Sending three multi-megabyte
// renders back through our API so a server could measure them would move the same
// bytes twice to produce a few hundred floats.
//
// The cost is real and bounded deliberately — see MAX_SPECTRUM_FRAMES.

/** Bars per waveform lane. Matches N_BARS in merged_app.py so the two views of
 *  the same run have the same resolution and read as the same picture. */
export const BAR_COUNT = 260;

/** FFT size for the spectrum. Large, because the interesting question is where
 *  the spectral cliff sits — around 16-21kHz — and that needs fine bins up top. */
const FFT_SIZE = 8192;

/** How many windows to average over.
 *
 *  Streamlit takes a percentile across *every* STFT frame; three minutes at 48kHz
 *  is ~4200 frames, and 4200 8192-point transforms in JS would block the main
 *  thread for seconds. Evenly-spaced sampling estimates the same percentile of the
 *  same distribution — this is a spectral envelope, not a transient hunt, and 200
 *  windows spread across the whole file is plenty to place a cliff. */
const MAX_SPECTRUM_FRAMES = 200;

/** Decode rate. Forced rather than inherited from the output device: a machine
 *  whose default context is 44.1kHz would resample a 48kHz render on the way in
 *  and cap the plot at 22.05kHz — hiding the top of exactly the band bandwidth
 *  extension is judged on. */
const DECODE_SAMPLE_RATE = 48000;

/** Lowest frequency plotted. Below this the log axis spends half its width on
 *  content no restoration step touches. */
export const MIN_PLOT_HZ = 100;

export interface AudioAnalysis {
  /** Peak absolute amplitude per bar, in [0, 1] relative to this file's own peak. */
  envelope: Float32Array;
  /** This file's true peak, so lanes can be put on one shared scale. */
  peak: number;
  durationSeconds: number;
  sampleRate: number;
  /** Log-spaced points for the spectrum plot. */
  spectrum: { hz: Float32Array; db: Float32Array };
}

// One decode per URL for the life of the page. A user switching between the
// waveform and spectrum views, or re-rendering on a theme change, must not
// re-download and re-decode 35MB three times.
const cache = new Map<string, Promise<AudioAnalysis>>();

/** Analyse one source. `key` identifies it for caching; `load` fetches the bytes. */
export function analyseAudio(
  key: string,
  load: () => Promise<ArrayBuffer>,
): Promise<AudioAnalysis> {
  const hit = cache.get(key);
  if (hit) return hit;

  const run = load()
    .then(decodeToMono)
    .then(({ mono, sampleRate }) => ({
      ...envelopeOf(mono),
      durationSeconds: mono.length / sampleRate,
      sampleRate,
      spectrum: spectrumOf(mono, sampleRate),
    }));

  // A rejected promise must not be cached, or one transient network failure makes
  // the plot permanently unavailable for the rest of the session.
  run.catch(() => cache.delete(key));
  cache.set(key, run);
  return run;
}

export interface EnvelopeDiff {
  /** Peak level change against the original, in dB. Negative means quieter. */
  levelDb: number;
  /** Length change in seconds. Non-zero means a step moved the time axis. */
  durationDelta: number;
  /** Mean absolute envelope difference, as a percentage of the original's mean.
   *  Zero means the stage returned its input untouched. */
  divergencePct: number;
}

/** How far one version's envelope has moved from the original's.
 *
 *  The plots show *that* something changed; this says how much, which is the
 *  difference between "V2 passed the audio through unchanged" and "V2 rebuilt a
 *  span you cannot see at this zoom level". Both are legitimate outcomes and they
 *  look identical on a 260-bar envelope.
 *
 *  Bar-wise rather than sample-wise on purpose: tempo correction shifts content
 *  along the time axis, so a sample-aligned difference would report a large change
 *  for audio that is merely offset. Comparing envelopes at a fixed 260 buckets
 *  spanning each file measures the shape, which is what the eye is comparing too.
 */
export function compareToOriginal(
  original: AudioAnalysis,
  version: AudioAnalysis,
): EnvelopeDiff {
  let sumOriginal = 0;
  let sumDiff = 0;
  for (let i = 0; i < BAR_COUNT; i++) {
    sumOriginal += original.envelope[i];
    sumDiff += Math.abs(version.envelope[i] - original.envelope[i]);
  }
  return {
    levelDb:
      original.peak > 0 && version.peak > 0
        ? 20 * Math.log10(version.peak / original.peak)
        : 0,
    durationDelta: version.durationSeconds - original.durationSeconds,
    divergencePct: sumOriginal > 0 ? (sumDiff / sumOriginal) * 100 : 0,
  };
}

export function fetchUrl(url: string): () => Promise<ArrayBuffer> {
  return async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not read the audio (${response.status}).`);
    }
    return response.arrayBuffer();
  };
}

export function readFile(file: File): () => Promise<ArrayBuffer> {
  return () => file.arrayBuffer();
}

async function decodeToMono(
  data: ArrayBuffer,
): Promise<{ mono: Float32Array; sampleRate: number }> {
  // OfflineAudioContext rather than AudioContext: decoding needs no output device
  // and no user gesture, and a live context would sit there holding hardware open
  // for a page that is only measuring.
  const context = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);
  const buffer = await context.decodeAudioData(data);

  const channels = buffer.numberOfChannels;
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < channels; c++) {
    const channel = buffer.getChannelData(c);
    for (let i = 0; i < channel.length; i++) mono[i] += channel[i];
  }
  if (channels > 1) {
    for (let i = 0; i < mono.length; i++) mono[i] /= channels;
  }
  return { mono, sampleRate: buffer.sampleRate };
}

function envelopeOf(mono: Float32Array): { envelope: Float32Array; peak: number } {
  const envelope = new Float32Array(BAR_COUNT);
  let peak = 0;
  for (let bar = 0; bar < BAR_COUNT; bar++) {
    const lo = Math.floor((bar * mono.length) / BAR_COUNT);
    const hi = Math.floor(((bar + 1) * mono.length) / BAR_COUNT);
    let max = 0;
    for (let i = lo; i < hi; i++) {
      const v = mono[i] < 0 ? -mono[i] : mono[i];
      if (v > max) max = v;
    }
    envelope[bar] = max;
    if (max > peak) peak = max;
  }
  return { envelope, peak };
}

function spectrumOf(
  mono: Float32Array,
  sampleRate: number,
): { hz: Float32Array; db: Float32Array } {
  const bins = FFT_SIZE / 2 + 1;
  const window = hann(FFT_SIZE);

  const usable = Math.max(0, mono.length - FFT_SIZE);
  const frames = usable > 0 ? Math.min(MAX_SPECTRUM_FRAMES, Math.floor(usable / 1024)) : 1;
  const stride = frames > 1 ? Math.floor(usable / (frames - 1)) : 0;

  // Magnitudes per bin across frames, so a percentile can be taken down each bin.
  const perBin: Float32Array[] = Array.from({ length: bins }, () => new Float32Array(frames));
  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);

  for (let f = 0; f < frames; f++) {
    const start = f * stride;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = (mono[start + i] ?? 0) * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let b = 0; b < bins; b++) {
      perBin[b][f] = Math.hypot(re[b], im[b]);
    }
  }

  // The 95th percentile, matching Streamlit's choice. A mean would be dragged down
  // by quiet passages and put the apparent cliff far below where content actually
  // stops; the high percentile reads "how high does this file ever reach".
  const nyquist = sampleRate / 2;
  const magnitude = new Float32Array(bins);
  for (let b = 0; b < bins; b++) {
    magnitude[b] = percentile(perBin[b], 0.95);
  }

  return toLogPoints(magnitude, nyquist);
}

/** Reduce linear bins to log-spaced plot points, keeping the max in each bucket.
 *
 *  Max, not mean: averaging across a bucket smears the spectral cliff — the one
 *  feature the plot exists to show — into a gentle slope. */
function toLogPoints(
  magnitude: Float32Array,
  nyquist: number,
): { hz: Float32Array; db: Float32Array } {
  const POINTS = 420;
  const bins = magnitude.length;
  const binHz = nyquist / (bins - 1);
  const logMin = Math.log10(MIN_PLOT_HZ);
  const logMax = Math.log10(nyquist);

  const hz = new Float32Array(POINTS);
  const db = new Float32Array(POINTS);
  for (let p = 0; p < POINTS; p++) {
    const lo = 10 ** (logMin + ((logMax - logMin) * p) / POINTS);
    const hi = 10 ** (logMin + ((logMax - logMin) * (p + 1)) / POINTS);
    const loBin = Math.max(1, Math.floor(lo / binHz));
    const hiBin = Math.min(bins - 1, Math.max(loBin + 1, Math.ceil(hi / binHz)));
    let max = 0;
    for (let b = loBin; b < hiBin; b++) if (magnitude[b] > max) max = magnitude[b];
    hz[p] = (lo + hi) / 2;
    db[p] = 20 * Math.log10(max + 1e-12);
  }
  return { hz, db };
}

function percentile(values: Float32Array, q: number): number {
  const sorted = Float32Array.from(values).sort();
  const index = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[index] ?? 0;
}

function hann(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

/** In-place iterative radix-2 Cooley-Tukey FFT.
 *
 *  Hand-written rather than pulled from a library: it is thirty lines, it runs in
 *  a page that must not grow a dependency for one plot, and FFT_SIZE is a fixed
 *  power of two so none of a general library's size handling is needed. */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}
