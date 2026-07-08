"use client";

// Wraps useUploadQueue with the per-batch project lifecycle: it drives the queue
// with a project-aware uploader, and when the queue drains (nothing queued or
// uploading, at least one success) it finalises the batch into a Project and
// slots it into the react-query cache so it shows up in the projects list. The
// UI (dropzone, queue, page) is unchanged — it still speaks only the queue's API.

import * as React from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUploadQueue, type UploadQueue } from "@/lib/hooks/use-upload-queue";
import { createUploadBatch } from "@/lib/upload/upload-batch";
import type { Uploader } from "@/lib/upload/upload-file";
import type { Paginated, Project } from "@/lib/types";

/** Upsert the finalised project into the detail + list caches (dedupe by id). */
function insertProject(queryClient: QueryClient, project: Project) {
  queryClient.setQueryData(["project", project.id], project);
  queryClient.setQueriesData<Paginated<Project>>(
    { queryKey: ["projects"] },
    (old) => {
      if (!old) return old;
      const existed = old.items.some((p) => p.id === project.id);
      const items = [project, ...old.items.filter((p) => p.id !== project.id)];
      return { ...old, items, total: existed ? old.total : old.total + 1 };
    },
  );
}

export function useUploadBatch(): UploadQueue {
  const queryClient = useQueryClient();

  const batchRef = React.useRef<ReturnType<typeof createUploadBatch>>(null);
  batchRef.current ??= createUploadBatch();

  // Stable uploader that always delegates to the current batch (clear() swaps it).
  const uploader = React.useMemo<Uploader>(
    () => (file, handlers) => batchRef.current!.uploader(file, handlers),
    [],
  );

  const finalizingRef = React.useRef(false);
  const finalizedCountRef = React.useRef(0);

  const queue = useUploadQueue({ uploader });
  const { uploading, queued, success } = queue.stats;

  // Finalise once the queue is idle with new successes. Re-runs if a later retry
  // adds successes; both finalize paths are idempotent so the same project refreshes.
  React.useEffect(() => {
    if (uploading > 0 || queued > 0) return;
    if (success <= finalizedCountRef.current) return;
    if (finalizingRef.current) return;

    finalizingRef.current = true;
    const countAtStart = success;
    batchRef
      .current!.finalize()
      .then((project) => {
        finalizedCountRef.current = countAtStart;
        insertProject(queryClient, project);
        toast.success(`"${project.title}" added to your projects.`);
      })
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "Couldn't finalise the upload.",
        );
      })
      .finally(() => {
        finalizingRef.current = false;
      });
  }, [uploading, queued, success, queryClient]);

  // Clearing the queue starts a fresh project for the next batch.
  const clear = React.useCallback(() => {
    queue.clear();
    batchRef.current = createUploadBatch();
    finalizedCountRef.current = 0;
    finalizingRef.current = false;
  }, [queue]);

  return { ...queue, clear };
}
