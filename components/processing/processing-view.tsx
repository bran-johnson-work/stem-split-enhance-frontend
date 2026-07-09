"use client";

// Orchestrates the project detail route for a single project. It owns only the
// live status (via useProcessingStatus) and composes:
//   • KN-24 ProcessingStepper   — the 7-state stepper
//   • KN-25 ProcessingWaveform  — animated waveform + per-stage progress
//   • KN-26 ProcessingError     — failed reason + retry
//   • KN-43 DeliveryPanel       — stems + master downloads, once completed
// Every child depends solely on `{ status, progress }`, so swapping the mock
// simulator for a real poll/socket is invisible here.
//
// The route has two faces. While work is in flight the waveform leads and the
// stepper is the main event. Once the pipeline completes, downloads take that
// hero slot — the animated waveform is a *processing* affordance with nothing
// left to say — and the stepper collapses into a record of what ran.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { DeliveryPanel } from "@/components/delivery/delivery-panel";
import { ProcessingError } from "@/components/processing/processing-error";
import { ProcessingStepper } from "@/components/processing/processing-stepper";
import { ProcessingWaveform } from "@/components/processing/processing-waveform";
import { StatusBadge } from "@/components/projects/status-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  const { status, progress, stageProgress, isRunning, isSimulated, retry } =
    useProcessingStatus(project);
  const completed = status === "completed";

  const handleRetry = () => {
    retry();
    toast.success(
      isSimulated
        ? "Retrying — your track is back in the queue."
        : "Refreshing status…",
    );
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
          {completed ? (
            <DeliveryPanel project={project} />
          ) : (
            <ProcessingWaveform
              status={status}
              progress={progress}
              running={isRunning}
            />
          )}

          {completed ? (
            <Card className="py-0">
              <Accordion type="single" collapsible>
                <AccordionItem value="pipeline">
                  <AccordionTrigger className="px-6 hover:no-underline">
                    Pipeline complete
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <ProcessingStepper
                      current={status}
                      stageProgress={stageProgress}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Processing pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessingStepper
                  current={status}
                  stageProgress={stageProgress}
                />
              </CardContent>
            </Card>
          )}

          <p className="text-muted-foreground text-center text-xs">
            {completed
              ? `Completed ${formatRelative(project.updatedAt)}`
              : `Updated ${formatRelative(project.updatedAt)} · status refreshes automatically`}
          </p>
        </>
      )}
    </div>
  );
}
