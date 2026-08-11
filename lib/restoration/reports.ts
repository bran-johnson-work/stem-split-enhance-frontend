// Reading the pipeline's reports.
//
// The backend passes `report` through verbatim as an untyped object, because it
// is the upstream pipeline's shape and this app is not its owner. These readers
// pull out the fields the UI shows and tolerate every one of them being absent:
// the two stages emit different shapes, fields are null when a step was skipped,
// and NaN/inf are serialised as null upstream.
//
// The metrics mirror the ones the pipeline's own Streamlit view shows, which is
// the reference for what a human reading a run actually needs.

import type { RestorationJob } from "@/lib/api/restoration";

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

// ---- Version 2: the repair decision ---------------------------------------

export interface V2Decision {
  /** False means V2 examined the audio and deliberately changed nothing. */
  isEnhanced: boolean;
  targetStem: string | null;
  /** The damaged span it repaired, in seconds. */
  region: [number, number] | null;
  riskBefore: number | null;
  riskAfter: number | null;
  sampleRate: number | null;
  notes: string[];
}

export function readV2(job: RestorationJob): V2Decision | null {
  const report = obj(job.report);
  if (!report) return null;

  const region = Array.isArray(report.region) && report.region.length === 2
    ? ([num(report.region[0]), num(report.region[1])] as [number | null, number | null])
    : null;

  return {
    isEnhanced: report.is_enhanced === true,
    targetStem: str(report.target_stem),
    region:
      region && region[0] !== null && region[1] !== null
        ? [region[0], region[1]]
        : null,
    riskBefore: num(report.risk_in_before),
    riskAfter: num(report.risk_in_after),
    sampleRate: num(report.final_sr),
    notes: Array.isArray(report.notes) ? report.notes.filter((n): n is string => typeof n === "string") : [],
  };
}

// ---- Version 3: what each step did ----------------------------------------

export interface V3StemResult {
  name: string;
  silent: boolean;
  inputChannels: number | null;
  outputChannels: number | null;
  inputSampleRate: number | null;
  outputSampleRate: number | null;
  /** Where the spectrum fell off, before and after bandwidth extension. */
  cutoffBeforeHz: number | null;
  cutoffAfterHz: number | null;
  /** Share of energy above the cutoff, as a percentage. */
  energyBeforePct: number | null;
  energyAfterPct: number | null;
  denoiseNote: string | null;
  stereoStrategy: string | null;
  notes: string[];
}

export interface V3Result {
  tempoNote: string | null;
  stems: V3StemResult[];
}

export function readV3(job: RestorationJob): V3Result | null {
  const report = obj(job.report);
  if (!report) return null;

  const stemsRaw = obj(report.stems) ?? {};
  const stems: V3StemResult[] = Object.entries(stemsRaw).flatMap(([name, raw]) => {
    const entry = obj(raw);
    if (!entry) return [];
    return [{
      name: str(entry.name) ?? name,
      silent: entry.silent === true,
      inputChannels: num(entry.input_channels),
      outputChannels: num(entry.output_channels),
      inputSampleRate: num(entry.input_sr),
      outputSampleRate: num(entry.output_sr),
      cutoffBeforeHz: num(entry.cliff_before_hz),
      cutoffAfterHz: num(entry.cliff_after_hz),
      energyBeforePct: num(entry.energy_before_pct),
      energyAfterPct: num(entry.energy_after_pct),
      denoiseNote: str(entry.denoise_note),
      stereoStrategy: str(entry.stereo_strategy),
      notes: Array.isArray(entry.notes) ? entry.notes.filter((n): n is string => typeof n === "string") : [],
    }];
  });

  return { tempoNote: str(report.tempo_note), stems };
}

// ---- The A/B measurement, when it was asked for ---------------------------

export interface QualityVerdict {
  /** Median 2s-window correlation with the input. Below ~0.90 means the timing
   *  or spectrum was disturbed — the pipeline's own threshold, not ours. */
  correlationMedian: number | null;
  correlationMin: number | null;
  /** Timing drift in milliseconds. Over ~5ms is a failure upstream. */
  offsetDriftMs: number | null;
  /** True when nothing crossed a threshold the pipeline treats as damage. */
  passed: boolean | null;
}

const CORRELATION_FLOOR = 0.9;
const DRIFT_CEILING_MS = 5;

export function readQuality(job: RestorationJob): QualityVerdict | null {
  const quality = obj(job.quality);
  if (!quality) return null;

  const timing = obj(quality.timing) ?? quality;
  const correlationMedian = num(timing.correlation_median);
  const correlationMin = num(timing.correlation_min);
  const offsetDriftMs = num(timing.offset_drift_ms);

  // Only claim a verdict when there is something to judge. Defaulting an absent
  // measurement to "passed" would present an unmeasured run as a verified one.
  const judged = [correlationMedian, offsetDriftMs].some((v) => v !== null);
  const passed = judged
    ? (correlationMedian === null || correlationMedian >= CORRELATION_FLOOR) &&
      (offsetDriftMs === null || Math.abs(offsetDriftMs) <= DRIFT_CEILING_MS)
    : null;

  return { correlationMedian, correlationMin, offsetDriftMs, passed };
}

// ---- Formatting -----------------------------------------------------------

export function formatHz(hz: number | null): string {
  if (hz === null) return "—";
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)} kHz` : `${Math.round(hz)} Hz`;
}

export function formatSeconds(s: number | null): string {
  if (s === null) return "—";
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return mins > 0 ? `${mins}:${secs.toFixed(1).padStart(4, "0")}` : `${secs.toFixed(1)}s`;
}

export function formatChannels(n: number | null): string {
  if (n === null) return "—";
  return n === 1 ? "mono" : n === 2 ? "stereo" : `${n}ch`;
}
