"use client";

// KN-26 — Error & retry state.
//
// Shown when a project's status is `failed`. Surfaces the failure reason the
// backend returned (falling back to a generic line) and offers two ways forward:
// retry processing in place, or re-upload the source. `onRetry` is wired to the
// transport's retry seam (lib/hooks/use-processing-status) — locally it re-runs
// the simulation from `queued`; against a real API it calls `retryProcessing`.

import Link from "next/link";
import { RotateCw, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGE_COLORS } from "@/lib/processing/pipeline";
import { cn } from "@/lib/utils";

const DEFAULT_REASON =
  "Something went wrong while processing this track. You can try again — if it keeps failing, re-upload the source file.";

export function ProcessingError({
  reason,
  onRetry,
  className,
}: {
  reason?: string;
  onRetry: () => void;
  className?: string;
}) {
  const color = STAGE_COLORS.failed;
  return (
    <div
      className={cn(
        "bg-card rounded-xl border p-6 text-center sm:p-8",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto grid size-14 place-items-center rounded-full",
          color.softBg,
          color.text,
        )}
      >
        <TriangleAlert className="size-7" />
      </div>

      <h2 className="mt-4 text-lg font-semibold">Processing failed</h2>
      <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm">
        {reason?.trim() || DEFAULT_REASON}
      </p>

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={onRetry}>
          <RotateCw className="size-4" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/upload">
            <Upload className="size-4" />
            Re-upload source
          </Link>
        </Button>
      </div>
    </div>
  );
}
