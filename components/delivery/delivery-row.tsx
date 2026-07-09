"use client";

// One downloadable file — a stem or the enhanced master. Purely presentational:
// the panel owns the pending state and the download call.

import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEM_META, fileExtension } from "@/lib/delivery/deliverables";
import { formatBytes, formatDuration } from "@/lib/format";
import type { Stem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DeliveryRow({
  stem,
  pending,
  disabled,
  onDownload,
}: {
  stem: Stem;
  /** This row's own download is in flight. */
  pending: boolean;
  /** Another download holds the transport. */
  disabled: boolean;
  onDownload: () => void;
}) {
  const meta = STEM_META[stem.kind];
  const Icon = meta.icon;
  const isMaster = stem.kind === "master";
  const format = fileExtension(stem.url).toUpperCase();

  // The master carries no size from the API; omit rather than render "0 B".
  const details = [
    format,
    stem.sizeBytes ? formatBytes(stem.sizeBytes) : null,
    stem.durationSec ? formatDuration(stem.durationSec) : null,
  ].filter(Boolean);

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3 sm:gap-4",
        isMaster && "bg-brand/5",
      )}
    >
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg",
          meta.softBg,
          meta.text,
        )}
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{stem.name}</p>
        <p className="text-muted-foreground truncate text-xs">
          <span className="tabular-nums">{details.join(" · ")}</span>
          <span className="hidden sm:inline"> · {meta.description}</span>
        </p>
      </div>

      <Button
        variant={isMaster ? "default" : "outline"}
        size="sm"
        onClick={onDownload}
        disabled={pending || disabled}
        aria-label={`Download ${stem.name} (${details.join(", ")})`}
      >
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Download aria-hidden />
        )}
        <span className="hidden sm:inline">Download</span>
      </Button>
    </li>
  );
}
