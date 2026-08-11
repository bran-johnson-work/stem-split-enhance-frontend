"use client";

// The separation + restoration pipeline, end to end, on one file.
//
// Two audiences, one screen. For a prospect it is the shortest path from "here is
// my track" to "here are my stems". For us it is a live probe of the real contract:
// every step below is an actual backend call, the bytes go straight to S3 through a
// presigned POST, and the progress text is the worker's own label rather than an
// animation. When something breaks in staging, this page says where.
//
// It deliberately pins ENGINE v3 (see DEMO_ENGINE_VERSION) instead of following the
// deployment default, so what is demonstrated is the restoration chain specifically.

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Download,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { USE_REAL_BACKEND } from "@/lib/config";
import { DEMO_ENGINE_VERSION, useDemoRun, type DemoPhase } from "@/lib/demo/use-demo-run";
import { formatBytes } from "@/lib/format";
import { findPlan } from "@/lib/billing/plans";
import { usePlans, useSubscription } from "@/lib/hooks/queries";
import { cn } from "@/lib/utils";

/** The four backend steps, in the order the run performs them. */
const STEPS: { key: DemoPhase; title: string; detail: string }[] = [
  { key: "creating", title: "Create project", detail: "POST /projects" },
  { key: "uploading", title: "Upload to storage", detail: "presigned POST, direct to S3" },
  { key: "finalizing", title: "Confirm upload", detail: "POST /upload-complete" },
  { key: "processing", title: "Separate & restore", detail: `engine ${DEMO_ENGINE_VERSION}` },
];

const ORDER: DemoPhase[] = ["idle", "creating", "uploading", "finalizing", "processing", "done"];

function stepState(step: DemoPhase, phase: DemoPhase): "done" | "active" | "todo" {
  if (phase === "done") return "done";
  const at = ORDER.indexOf(phase);
  const mine = ORDER.indexOf(step);
  if (at > mine) return "done";
  if (at === mine) return "active";
  return "todo";
}

/**
 * The end-to-end pipeline run, mounted by the signed-in `/pipeline-demo` route.
 *
 * Deliberately NOT what the public `/demo` page shows. That page renders the
 * Streamlit embed for every visitor, signed in or not: a marketing URL whose
 * content depends on an invisible session cookie is impossible to reason about
 * — the same link showed two different products depending on who opened it,
 * while the marketing header (which never consults auth) claimed "Log in"
 * either way.
 */
export function PipelineRunner() {
  const { state, start, reset } = useDemoRun();
  const { data: sub } = useSubscription();
  const { data: plans } = usePlans();
  const plan = sub && plans ? findPlan(plans, sub.planId) : undefined;

  const running =
    state.phase === "creating" ||
    state.phase === "uploading" ||
    state.phase === "finalizing" ||
    state.phase === "processing";

  const startOver =
    state.phase !== "idle" ? (
      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw className="size-4" />
        Start over
      </Button>
    ) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Pipeline demo"
        description="Drop in one track and watch it go through the full separation and restoration pipeline — the same calls the product makes, nothing simulated."
        action={startOver ?? undefined}
      />

      {!USE_REAL_BACKEND && (
        <Alert>
          <CircleAlert />
          <AlertDescription>
            No backend is configured. Set <code>NEXT_PUBLIC_API_URL</code> to run
            the demo — this page has no mock path on purpose, because a simulated
            run would prove nothing.
          </AlertDescription>
        </Alert>
      )}

      {state.phase === "idle" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="text-brand size-4" />
              Pick a track
            </CardTitle>
            <CardDescription>
              One file, start to finish. It becomes a real project you can reopen
              from Projects afterwards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadDropzone
              onFilesAccepted={(files) => void start(files[0])}
              maxFileSizeMb={plan?.maxFileSizeMb}
              disabled={!USE_REAL_BACKEND}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{state.file?.name}</CardTitle>
            <CardDescription>
              {state.file ? formatBytes(state.file.size) : null}
              {" · engine "}
              <Badge variant="outline" className="ml-0.5">
                {DEMO_ENGINE_VERSION}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {STEPS.map((step) => {
              const status = state.phase === "error" ? "todo" : stepState(step.key, state.phase);
              const isUpload = step.key === "uploading";
              const isJob = step.key === "processing";
              const pct = isUpload ? state.uploadPct : isJob ? state.jobPct : 0;
              return (
                <div key={step.key} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs",
                      status === "done" && "border-brand/40 bg-brand/10 text-brand",
                      status === "active" && "border-brand bg-brand/15 text-brand",
                      status === "todo" && "border-border text-muted-foreground",
                    )}
                  >
                    {status === "done" ? (
                      <CircleCheck className="size-3.5" />
                    ) : status === "active" ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          status === "todo" && "text-muted-foreground",
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {isJob && status === "active" && state.step
                          ? state.step
                          : step.detail}
                      </p>
                    </div>
                    {(isUpload || isJob) && status !== "todo" && (
                      <Progress value={status === "done" ? 100 : pct} />
                    )}
                  </div>
                </div>
              );
            })}

            {state.phase === "error" && (
              <>
                <Separator />
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              </>
            )}

            {running && state.phase === "processing" && (
              <p className="text-muted-foreground text-center text-xs">
                Restoration runs a second model pass over every stem, so this takes
                longer than a plain separation. Status refreshes automatically.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {state.phase === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {state.stems.length} {state.stems.length === 1 ? "stem" : "stems"}
            </CardTitle>
            <CardDescription>
              Signed download links, straight from storage. They expire — reopen the
              project to mint fresh ones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.stems.map((stem) => (
              <div key={stem.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{stem.name}</p>
                  <Button asChild variant="ghost" size="sm">
                    <a href={stem.url} download>
                      <Download className="size-4" />
                      Download
                    </a>
                  </Button>
                </div>
                {/* A plain <audio> rather than the mixer: the demo is about the
                    pipeline finishing, and one transport per stem is the least
                    that can go wrong on a stranger's machine. */}
                <audio controls preload="none" src={stem.url} className="w-full" />
              </div>
            ))}

            {state.projectId && (
              <>
                <Separator />
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/projects/${state.projectId}`}>
                    Open the full project view
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
