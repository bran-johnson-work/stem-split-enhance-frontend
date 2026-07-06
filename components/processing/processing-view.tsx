"use client";

// Orchestrates the Day-8 processing pipeline for a single project. It owns only
// the live status (via useProcessingStatus) and composes the three tickets:
//   • KN-24 ProcessingStepper   — the 7-state stepper
//   • KN-25 ProcessingWaveform  — animated waveform + per-stage progress
//   • KN-26 ProcessingError     — failed reason + retry
// Every child depends solely on `{ status, progress }`, so swapping the mock
// simulator for a real poll/socket is invisible here.

import Link from "next/link";
import { ArrowLeft, CircleCheckBig } from "lucide-react";
import { toast } from "sonner";
import { ProcessingError } from "@/components/processing/processing-error";
import { ProcessingStepper } from "@/components/processing/processing-stepper";
import { ProcessingWaveform } from "@/components/processing/processing-waveform";
import { StatusBadge } from "@/components/projects/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBytes, formatDuration, formatRelative } from "@/lib/format";
import { useProcessingStatus } from "@/lib/hooks/use-processing-status";
import type { Project } from "@/lib/types";

export function ProcessingView({ project }: { project: Project }) {
  const { status, progress, stageProgress, isRunning, retry } =
    useProcessingStatus(project);

  const handleRetry = () => {
    retry();
    toast.success("Retrying — your track is back in the queue.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 mb-2"
        >
          <Link href="/projects">
            <ArrowLeft className="size-4" />
            All projects
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.title}
          </h1>
          <StatusBadge status={status} />
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {project.sourceFileName} · {formatBytes(project.sourceSizeBytes)}
          {project.durationSec ? ` · ${formatDuration(project.durationSec)}` : ""}
        </p>
      </div>

      {status === "failed" ? (
        <ProcessingError reason={project.error} onRetry={handleRetry} />
      ) : (
        <>
          <ProcessingWaveform
            status={status}
            progress={progress}
            running={isRunning}
          />

          {status === "completed" && <CompletedPanel project={project} />}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {status === "completed"
                  ? "Pipeline complete"
                  : "Processing pipeline"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessingStepper current={status} stageProgress={stageProgress} />
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-center text-xs">
            Updated {formatRelative(project.updatedAt)} · status refreshes
            automatically
          </p>
        </>
      )}
    </div>
  );
}

// Completed confirmation. The full stem-list + audio-player download experience
// lands on this same route in Day 10 (KN-29/KN-30); until then we confirm what's
// ready without fabricating a link to an unbuilt view.
function CompletedPanel({ project }: { project: Project }) {
  const stemCount = project.stems.length;
  return (
    <div className="border-completed/30 bg-completed/5 flex items-start gap-3 rounded-xl border p-6">
      <div className="bg-completed/15 text-completed grid size-11 shrink-0 place-items-center rounded-lg">
        <CircleCheckBig className="size-6" />
      </div>
      <div className="min-w-0">
        <p className="font-medium">Your track is ready</p>
        <p className="text-muted-foreground text-sm">
          {stemCount > 0
            ? `${stemCount} stems + an enhanced master have been processed.`
            : "Your stems and enhanced master have been processed."}{" "}
          The download &amp; player view arrives in the next release.
        </p>
      </div>
    </div>
  );
}
