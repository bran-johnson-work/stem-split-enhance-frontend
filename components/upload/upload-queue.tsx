"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadQueueItem } from "@/components/upload/upload-queue-item";
import type { UploadQueue as Queue } from "@/lib/hooks/use-upload-queue";

export function UploadQueue({
  items,
  stats,
  cancel,
  retry,
  remove,
  clear,
}: Queue) {
  if (items.length === 0) return null;

  const { total, success, uploading, overallProgress } = stats;
  const done = uploading === 0 && stats.queued === 0;

  return (
    <section className="space-y-4" aria-label="Upload queue">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {done
              ? `${success} of ${total} uploaded`
              : `Uploading ${success + uploading} of ${total}…`}
          </p>
          <Progress
            value={overallProgress}
            className="mt-2 h-1.5 w-40 max-w-full"
          />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          Clear all
        </Button>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <UploadQueueItem
              item={item}
              onCancel={cancel}
              onRetry={retry}
              onRemove={remove}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
