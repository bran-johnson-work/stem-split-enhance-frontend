"use client";

import { ChevronRight, FolderClock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/lib/hooks/queries";
import { formatRelative } from "@/lib/format";
import type { Project } from "@/lib/types";

/** How many projects to scan for resumable ones. Past any sensible in-flight set. */
const SCAN_WINDOW = 50;

/** Files already uploaded into a project. */
function fileCount(p: Project): number {
  return p.inputFiles?.length ?? 0;
}

/**
 * A project can still receive source audio only before it starts processing.
 * Every pre-processing backend state (pending/uploading/queued) maps to the
 * frontend `queued` status, so that's the whole resumable set — including the
 * empty project left behind when someone creates one and navigates away.
 */
function isResumable(p: Project): boolean {
  return p.status === "queued";
}

/**
 * Lists the projects a user can resume uploading into, on the Upload view, so a
 * project created-but-not-uploaded (or one they want to add more files to) is
 * reachable again instead of being stranded. Renders nothing when there are none.
 */
export function ProjectPicker({
  onSelect,
}: {
  onSelect: (project: Project) => void;
}) {
  const { data, isLoading } = useProjects({ page: 1, pageSize: SCAN_WINDOW });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Continue a project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const resumable = (data?.items ?? [])
    .filter(isResumable)
    // Empty (forgotten) projects first, then most recently touched.
    .sort((a, b) => {
      const emptyDelta = Number(fileCount(a) === 0) - Number(fileCount(b) === 0);
      if (emptyDelta !== 0) return -emptyDelta;
      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });

  if (resumable.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Continue a project</CardTitle>
        <CardDescription>
          Pick a project you haven&apos;t finished uploading to and add its audio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {resumable.map((p) => {
          const n = fileCount(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className="hover:bg-muted/40 focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-lg border p-4 text-left outline-none transition-colors focus-visible:ring-[3px]"
            >
              <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-md">
                <FolderClock className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-muted-foreground text-sm">
                  {n === 0 ? (
                    <span className="text-mastering">No files yet</span>
                  ) : (
                    `${n} audio file${n === 1 ? "" : "s"}`
                  )}{" "}
                  · updated {formatRelative(p.updatedAt)}
                </p>
              </div>
              <ChevronRight
                className="text-muted-foreground size-5 shrink-0"
                aria-hidden
              />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
