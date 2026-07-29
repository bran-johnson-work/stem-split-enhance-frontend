"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { UploadQueue } from "@/components/upload/upload-queue";
import { Button } from "@/components/ui/button";
import { useUploadBatch } from "@/lib/hooks/use-upload-batch";
import type { Plan, Project } from "@/lib/types";

/**
 * Uploads audio into an already-created project (create-project-first flow) and
 * enforces this month's audio-file cap client-side. The backend is the real
 * authority — it refuses the presigned URL once the cap is hit — so this is UX:
 * it disables the dropzone and trims over-cap drops before they start.
 *
 * Must be keyed by `project.id` at the call site so switching projects gets a
 * fresh upload batch.
 */
export function ProjectUploader({
  project,
  cap,
  maxFileSizeMb,
  usedThisMonth,
  onNewProject,
}: {
  project: Project;
  /** This plan's monthly audio-file allowance. */
  cap: Plan["uploadsPerMonth"];
  /** This plan's per-file size ceiling in MB. Undefined while the plan loads. */
  maxFileSizeMb?: number;
  /** Files already uploaded across all projects this month, at mount. */
  usedThisMonth: number;
  onNewProject: () => void;
}) {
  const router = useRouter();
  const queue = useUploadBatch(project.id);

  // Snapshot the month's usage on mount so finalize-driven cache refreshes don't
  // double-count this session's files (they're already tracked via `consumed`).
  const [usedAtMount] = React.useState(usedThisMonth);

  const unlimited = cap === "unlimited";
  // Files added this session that count toward the cap (canceled ones don't).
  const consumed = queue.items.filter((i) => i.status !== "canceled").length;
  const remaining = unlimited ? Infinity : cap - usedAtMount - consumed;
  const atCap = remaining <= 0;
  const usedDisplay = usedAtMount + consumed;

  function handleAccepted(files: File[]) {
    if (unlimited) {
      queue.add(files);
      return;
    }
    if (remaining <= 0) {
      toast.error(`You've reached this month's limit of ${cap} audio files.`);
      return;
    }
    if (files.length > remaining) {
      const room = remaining;
      toast.error(
        `Only ${room} more ${room === 1 ? "file fits" : "files fit"} in this month's limit — the rest weren't added.`,
      );
    }
    queue.add(files.slice(0, remaining));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-md">
            <FolderOpen className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{project.title}</p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {unlimited
                ? "Unlimited uploads this month"
                : `${usedDisplay} of ${cap} audio files used this month`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onNewProject}>
          New project
        </Button>
      </div>

      <UploadDropzone
        onFilesAccepted={handleAccepted}
        maxFileSizeMb={maxFileSizeMb}
        disabled={atCap}
      />

      {atCap && (
        <p className="text-muted-foreground text-center text-sm">
          You&apos;ve reached this month&apos;s limit of {cap} audio files.{" "}
          <a href="/billing" className="text-brand font-medium underline-offset-4 hover:underline">
            Upgrade your plan
          </a>{" "}
          to add more.
        </p>
      )}

      <UploadQueue {...queue} />

      {queue.stats.success > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => router.push("/projects")}>
            View in projects
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
