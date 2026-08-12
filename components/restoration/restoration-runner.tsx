"use client";

// One track through the V2 + V3 restoration pipeline.
//
// This is the enhancement pipeline, not stem separation — it repairs and restores
// one piece of audio rather than splitting it apart. The two stages run on a
// remote GPU host, chained: V3 consumes the file V2 writes, so it cannot start
// until V2 finishes. Every step below is a real call.
//
// The controls mirror the pipeline's own Streamlit app: checkboxes, not sliders,
// because every parameter it exposes is genuinely a switch.

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  RotateCcw,
  Waves,
} from "lucide-react";
import { AuditionPanel } from "@/components/restoration/audition-panel";
import { ResultCompare } from "@/components/restoration/result-compare";
import {
  QualityCard,
  V2ReportCard,
  V3ReportCard,
} from "@/components/restoration/stage-reports";
import { PageHeader } from "@/components/shared/page-header";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { USE_REAL_BACKEND } from "@/lib/config";
import { formatBytes, formatDuration } from "@/lib/format";
import { findPlan } from "@/lib/billing/plans";
import { usePlans, useRestorationService, useSubscription } from "@/lib/hooks/queries";
import {
  activeJob,
  DEFAULT_OPTIONS,
  overallPercent,
  TYPICAL_RUN_SECONDS,
  useRestorationRun,
  type RestorationOptions,
  type RestorationPhase,
} from "@/lib/restoration/use-restoration-run";
import { cn } from "@/lib/utils";

const STAGES: { key: RestorationPhase; title: string; detail: string }[] = [
  { key: "creating", title: "Create project", detail: "POST /projects" },
  { key: "uploading", title: "Upload to storage", detail: "presigned POST, direct to S3" },
  { key: "repairing", title: "Version 2 — repair", detail: "localized MIDI repair" },
  { key: "restoring", title: "Version 3 — restore", detail: "tempo, denoise, bandwidth" },
];

const ORDER: RestorationPhase[] = [
  "idle",
  "creating",
  "uploading",
  "repairing",
  "restoring",
  "done",
];

function stageState(
  stage: RestorationPhase,
  phase: RestorationPhase,
  skipped: boolean,
): "done" | "active" | "todo" | "skipped" {
  if (skipped) return "skipped";
  if (phase === "done") return "done";
  const at = ORDER.indexOf(phase);
  const mine = ORDER.indexOf(stage);
  if (at > mine) return "done";
  if (at === mine) return "active";
  return "todo";
}

function OptionRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

export function RestorationRunner() {
  const { state, start, reset } = useRestorationRun();
  const { data: sub } = useSubscription();
  const { data: plans } = usePlans();
  const { data: service } = useRestorationService();
  const plan = sub && plans ? findPlan(plans, sub.planId) : undefined;

  const [options, setOptions] = React.useState<RestorationOptions>(DEFAULT_OPTIONS);
  const set = <K extends keyof RestorationOptions>(key: K, value: RestorationOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  // Bandwidth extension needs the Apollo checkout on the GPU host. Without it the
  // step raises rather than degrading, so the toggle is forced off up front instead
  // of failing a run that has already spent minutes on the queue.
  //
  // Derived rather than synced into state: the availability answer arrives after
  // the first render and can change again while the page is open, and an effect
  // writing back into `options` would both cascade a render and strand the user's
  // own choice once the host recovered.
  const apolloMissing = Boolean(service?.enabled && service.reachable && !service.apollo);
  const unavailable = Boolean(service && (!service.enabled || !service.reachable));
  const effective: RestorationOptions = {
    ...options,
    bandwidth: options.bandwidth && !apolloMissing,
  };

  const percent = overallPercent(state, effective.runRepair);
  const queuedBehind = activeJob(state)?.queuePosition ?? 0;
  // A host whose torch is a CPU-only wheel reports cuda:true from the driver and
  // still runs every model on the CPU. That is a ten-fold difference in wall clock
  // and the only place it is visible is here, so it is said before a run rather
  // than discovered during one.
  const cpuBound = Boolean(
    service?.reachable && service.device && !service.device.startsWith("cuda"),
  );

  const startOver =
    state.phase !== "idle" ? (
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw className="size-4" />
        Start over
      </Button>
    ) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Audio restoration"
        description="Repair and restore one track: localized repair, then tempo correction, denoise and bandwidth extension. The same pipeline the engine team runs, on your file."
        action={startOver ?? undefined}
      />

      {!USE_REAL_BACKEND && (
        <Alert>
          <CircleAlert />
          <AlertDescription>
            No backend is configured. Set <code>NEXT_PUBLIC_API_URL</code> — this
            page has no mock path, because a simulated restoration would prove
            nothing.
          </AlertDescription>
        </Alert>
      )}

      {unavailable && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>
            {/* The backend's `detail` is already a complete sentence naming the
                specific failure (unavailable / timed out / misconfigured), so it
                replaces a lead-in rather than following one. Concatenating both
                printed the same fact twice. */}
            {!service?.enabled
              ? "Audio restoration is not configured on this server."
              : (service.detail ??
                "The restoration service is not responding right now.")}
            {service?.enabled ? " Runs will fail until it is back." : ""}
          </AlertDescription>
        </Alert>
      )}

      {service?.reachable && (!service.cuda || cpuBound) && (
        <Alert>
          <CircleAlert />
          <AlertDescription>
            {service.cuda
              ? "The restoration host has a GPU but is configured to run on CPU, so this will take considerably longer."
              : "The restoration host has no GPU available, so this will run on CPU and take considerably longer."}
          </AlertDescription>
        </Alert>
      )}

      {/* A cold host spends minutes downloading checkpoints before the first step
          appears. Saying so is the difference between a slow start and a broken one. */}
      {service?.reachable && !service.warm && (
        <Alert>
          <CircleAlert />
          <AlertDescription>
            The restoration host is still loading its models after a restart. The
            first run will take a few minutes longer than usual.
          </AlertDescription>
        </Alert>
      )}

      {state.phase === "idle" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Steps to run</CardTitle>
              <CardDescription>
                Every parameter the pipeline exposes is a switch. Turning one off
                skips that step entirely rather than softening it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <OptionRow
                id="opt-repair"
                label="Version 2 — localized repair"
                description="Find one damaged span and re-render it from donor notes elsewhere in the track. Rolled back automatically if it does not lower the measured risk."
                checked={options.runRepair}
                onChange={(v) => set("runRepair", v)}
              />
              <OptionRow
                id="opt-tempo"
                label="Tempo correction"
                description="Detect and correct drift against a single warp shared by the whole track."
                checked={options.tempo}
                onChange={(v) => set("tempo", v)}
              />
              <OptionRow
                id="opt-denoise"
                label="Denoise"
                description="Mel-Band RoFormer denoise pass."
                checked={options.denoise}
                onChange={(v) => set("denoise", v)}
              />
              <OptionRow
                id="opt-bandwidth"
                label="Bandwidth extension"
                description={
                  apolloMissing
                    ? "Unavailable — the Apollo model is not installed on the restoration host."
                    : "Rebuild high frequencies lost to lossy encoding."
                }
                checked={effective.bandwidth}
                disabled={apolloMissing}
                onChange={(v) => set("bandwidth", v)}
              />
              <OptionRow
                id="opt-quality"
                label="Measure quality"
                description="A/B the result against the input. Adds roughly 10 seconds per minute of audio."
                checked={options.quality}
                onChange={(v) => set("quality", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Waves className="text-brand size-4" />
                Pick a track
              </CardTitle>
              <CardDescription>
                One file, start to finish. It becomes a real project you can reopen
                from Projects afterwards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadDropzone
                onFilesAccepted={(files) => void start(files[0], effective)}
                maxFileSizeMb={plan?.maxFileSizeMb}
                disabled={!USE_REAL_BACKEND || unavailable}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {state.file?.name ?? "Restoration run"}
              </CardTitle>
              <CardDescription>
                {state.file ? formatBytes(state.file.size) : null}
                {service?.gpu ? ` · ${service.gpu}` : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* One bar for the whole run, above the per-stage list.
                  The pipeline reports named steps rather than a percentage, and the
                  bar is the backend's estimate from those steps — monotonic, and it
                  stops short of 100 until the run really finishes. It is here
                  because the alternative, a single line of text that changes every
                  minute or two across a multi-minute GPU run, is indistinguishable
                  from a hang: people reload, start again, and queue a second job
                  behind their own on a host that runs one at a time. */}
              {state.phase !== "error" && (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">
                      {state.phase === "done" ? "Finished" : "Working"}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {percent}% · {formatDuration(state.elapsedSeconds)}
                      {state.phase !== "done" &&
                        state.elapsedSeconds < TYPICAL_RUN_SECONDS &&
                        ` of ~${formatDuration(TYPICAL_RUN_SECONDS)}`}
                    </span>
                  </div>
                  <Progress value={percent} className="h-2" />
                  <p className="text-muted-foreground text-xs">
                    {queuedBehind > 0
                      ? `Waiting for the GPU — ${queuedBehind} ${queuedBehind === 1 ? "run is" : "runs are"} ahead of yours. It processes one at a time.`
                      : state.phase === "done"
                        ? "Both stages complete."
                        : // `step` is "" before the first label arrives, not null.
                          state.step || "Queued"}
                  </p>
                </div>
              )}

              {STAGES.map((stage) => {
                const skipped = stage.key === "repairing" && !effective.runRepair;
                const status = stageState(stage.key, state.phase, skipped);
                const isActive = status === "active" && state.phase !== "error";
                return (
                  <div key={stage.key} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {status === "done" ? (
                        <CircleCheck className="text-brand size-4" />
                      ) : isActive ? (
                        <LoaderCircle className="text-brand size-4 animate-spin" />
                      ) : (
                        <div
                          className={cn(
                            "border-muted-foreground/40 size-4 rounded-full border",
                            status === "skipped" && "opacity-40",
                          )}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            status === "todo" && "text-muted-foreground",
                            status === "skipped" && "text-muted-foreground line-through",
                          )}
                        >
                          {stage.title}
                        </span>
                        {status === "skipped" && (
                          <Badge variant="outline" className="text-xs">
                            skipped
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {/* The pipeline's own label while this stage runs — it
                            reports steps, never a percentage, so none is shown. */}
                        {isActive && state.step ? state.step : stage.detail}
                      </p>
                      {stage.key === "uploading" && state.phase === "uploading" && (
                        <Progress value={state.uploadPct} className="mt-2 h-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {state.phase === "error" && (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {(state.v2?.isFinished || state.v3?.isFinished || state.originalUrl) && (
            <AuditionPanel
              filename={state.file?.name ?? "track"}
              tracks={[
                {
                  key: "original",
                  label: "Original",
                  url: state.originalUrl,
                  caption: "as uploaded",
                },
                {
                  key: "v2",
                  label: "Version 2",
                  url: state.v2?.url ?? null,
                  caption: "localized repair",
                  placeholder: effective.runRepair
                    ? "Runs after the upload completes."
                    : "Version 2 was skipped.",
                },
                {
                  key: "v3",
                  label: "Version 3",
                  url: state.v3?.url ?? null,
                  caption: "restored",
                  placeholder: "Runs after Version 2 finishes.",
                },
              ]}
            />
          )}

          {/* Only once the run is complete. Analysing V2 the moment it lands would
              pull three files' worth of bandwidth and main-thread time while the
              user is still waiting on the V3 job that follows it. */}
          {state.phase === "done" && (
            <ResultCompare
              sources={[
                { key: "original", label: "Original", file: state.file },
                { key: "v2", label: "Version 2", url: state.v2?.url },
                { key: "v3", label: "Version 3", url: state.v3?.url },
              ]}
            />
          )}

          {state.v2?.isFinished && <V2ReportCard job={state.v2} />}
          {state.v3?.isFinished && <V3ReportCard job={state.v3} />}
          {state.v3?.isFinished && <QualityCard job={state.v3} />}

          {state.phase === "done" && state.projectId && (
            <div className="flex justify-end">
              <Button asChild variant="outline">
                <Link href={`/projects/${state.projectId}`}>
                  Open project
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
