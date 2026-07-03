"use client";

import { FileAudio, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import type { QueueItem, QueueStatus } from "@/lib/hooks/use-upload-queue";
import { cn } from "@/lib/utils";

const STATUS: Record<QueueStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-muted text-muted-foreground" },
  uploading: { label: "Uploading", className: "bg-brand/10 text-brand" },
  success: { label: "Uploaded", className: "bg-completed/15 text-completed" },
  error: { label: "Failed", className: "bg-failed/15 text-failed" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground" },
};

export function UploadQueueItem({
  item,
  onCancel,
  onRetry,
  onRemove,
}: {
  item: QueueItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const status = STATUS[item.status];
  const canRetry = item.status === "error" || item.status === "canceled";

  return (
    <div className="bg-card flex items-center gap-4 rounded-xl border p-4">
      <div className="bg-brand-tint text-brand grid size-11 shrink-0 place-items-center rounded-lg">
        <FileAudio className="size-5" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{item.file.name}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>

        {item.status === "uploading" ? (
          <div className="flex items-center gap-2">
            <Progress value={item.progress} className="h-1.5" />
            <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
              {item.progress}%
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground truncate text-sm">
            {item.status === "error" && item.error
              ? item.error
              : formatBytes(item.file.size)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {canRetry && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRetry(item.id)}
            aria-label={`Retry upload of ${item.file.name}`}
          >
            <RotateCw className="size-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            item.status === "uploading"
              ? onCancel(item.id)
              : onRemove(item.id)
          }
          aria-label={
            item.status === "uploading"
              ? `Cancel upload of ${item.file.name}`
              : `Remove ${item.file.name}`
          }
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
