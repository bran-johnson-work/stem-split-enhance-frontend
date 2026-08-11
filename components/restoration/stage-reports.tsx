"use client";

// What each stage decided.
//
// The metrics mirror the pipeline's own Streamlit view, which is the reference
// for what a human reading a run needs: for V2 whether it changed anything and
// where, for V3 what each step did to the spectrum and channel layout.
//
// Every value can legitimately be absent — a skipped step, a null from a
// non-finite float — so each renders "—" rather than being hidden. A missing row
// and a measured-zero row must not look the same.

import { CircleAlert, CircleCheck, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RestorationJob } from "@/lib/api/restoration";
import {
  formatChannels,
  formatHz,
  formatSeconds,
  readQuality,
  readV2,
  readV3,
} from "@/lib/restoration/reports";

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function V2ReportCard({ job }: { job: RestorationJob }) {
  const decision = readV2(job);
  if (!decision) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Version 2 — localized repair
          {decision.isEnhanced ? (
            <Badge variant="secondary">Enhanced</Badge>
          ) : (
            <Badge variant="outline">Unchanged</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {decision.isEnhanced
            ? "One damaged span was detected and re-rendered from donor notes elsewhere in the track."
            : "The repair was evaluated and rolled back — it did not lower the measured risk, so the original was kept."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric
            label="Outcome"
            value={decision.isEnhanced ? "Enhanced" : "Unchanged"}
          />
          <Metric label="Target stem" value={decision.targetStem ?? "—"} />
          <Metric
            label="Flagged region"
            value={
              decision.region
                ? `${formatSeconds(decision.region[0])} – ${formatSeconds(decision.region[1])}`
                : "—"
            }
          />
          <Metric
            label="Risk before → after"
            value={
              decision.riskBefore !== null && decision.riskAfter !== null
                ? `${decision.riskBefore.toFixed(2)} → ${decision.riskAfter.toFixed(2)}`
                : "—"
            }
          />
        </div>

        {decision.notes.length > 0 && (
          <ul className="text-muted-foreground space-y-1 text-xs">
            {decision.notes.map((note, i) => (
              <li key={i} className="flex gap-2">
                <Minus className="mt-0.5 size-3 shrink-0" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function V3ReportCard({ job }: { job: RestorationJob }) {
  const result = readV3(job);
  if (!result) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Version 3 — restoration</CardTitle>
        <CardDescription>
          Tempo correction, denoise and bandwidth extension. Each step is gated:
          a step that would change the channel layout is refused, not applied.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.tempoNote && (
          <p className="text-muted-foreground text-xs">{result.tempoNote}</p>
        )}

        {result.stems.map((stem) => (
          <div key={stem.name} className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{stem.name}</span>
              {stem.silent && <Badge variant="outline">silent</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric
                label="Channels in → out"
                value={`${formatChannels(stem.inputChannels)} → ${formatChannels(stem.outputChannels)}`}
              />
              <Metric
                label="Sample rate"
                value={
                  stem.outputSampleRate !== null
                    ? `${(stem.outputSampleRate / 1000).toFixed(1)} kHz`
                    : "—"
                }
              />
              <Metric
                label="Cutoff before → after"
                value={`${formatHz(stem.cutoffBeforeHz)} → ${formatHz(stem.cutoffAfterHz)}`}
              />
              <Metric
                label="Energy above cutoff"
                value={
                  stem.energyAfterPct !== null
                    ? `${stem.energyBeforePct?.toFixed(2) ?? "—"}% → ${stem.energyAfterPct.toFixed(2)}%`
                    : "—"
                }
              />
            </div>

            {(stem.denoiseNote || stem.stereoStrategy) && (
              <p className="text-muted-foreground text-xs">
                {[stem.denoiseNote, stem.stereoStrategy && `stereo: ${stem.stereoStrategy}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** The A/B measurement, shown only when the run was asked to compute one. */
export function QualityCard({ job }: { job: RestorationJob }) {
  const verdict = readQuality(job);
  if (!verdict) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Quality check
          {verdict.passed === true && (
            <Badge variant="secondary" className="gap-1">
              <CircleCheck className="size-3" /> Passed
            </Badge>
          )}
          {verdict.passed === false && (
            <Badge variant="destructive" className="gap-1">
              <CircleAlert className="size-3" /> Review
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Measured against the input. Correlation below 0.90, or drift over 5 ms,
          means the timing or spectrum was disturbed rather than repaired.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric
            label="Correlation (median)"
            value={verdict.correlationMedian?.toFixed(3) ?? "—"}
          />
          <Metric
            label="Correlation (min)"
            value={verdict.correlationMin?.toFixed(3) ?? "—"}
          />
          <Metric
            label="Timing drift"
            value={
              verdict.offsetDriftMs !== null
                ? `${verdict.offsetDriftMs.toFixed(2)} ms`
                : "—"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
