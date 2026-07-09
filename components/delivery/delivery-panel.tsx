"use client";

// KN-43 — Download & delivery.
//
// The payoff screen: everything a completed project produced, each row with its
// own download control, plus a "Download all". Rendered by ProcessingView once
// the pipeline reports `completed`.
//
// Transport lives behind the `Downloader` seam (lib/download), so with no
// backend the full UX runs against simulated transfers; the row list itself is
// the mount point for the KN-44 audio player.

import * as React from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { DeliveryEmpty } from "@/components/delivery/delivery-empty";
import { DeliveryRow } from "@/components/delivery/delivery-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deliverables, downloadFilename } from "@/lib/delivery/deliverables";
import { downloadAll } from "@/lib/download/download-all";
import {
  IS_SIMULATED_DOWNLOAD,
  downloadFile,
} from "@/lib/download/download-file";
import type { Project, Stem } from "@/lib/types";

/** Appended to success toasts when no backend is wired, so we don't claim a file landed. */
const SIMULATED_NOTE = "Simulated — connect a backend to fetch real audio.";

export function DeliveryPanel({ project }: { project: Project }) {
  const files = React.useMemo(() => deliverables(project), [project]);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [allPending, setAllPending] = React.useState(false);
  const busy = allPending || pendingId !== null;

  if (files.length === 0) return <DeliveryEmpty />;

  const stemCount = files.filter((f) => f.kind !== "master").length;

  const handleDownload = async (stem: Stem) => {
    setPendingId(stem.id);
    try {
      await downloadFile({
        url: stem.url,
        filename: downloadFilename(project, stem),
      });
      toast.success(`${stem.name} — download started.`, {
        description: IS_SIMULATED_DOWNLOAD ? SIMULATED_NOTE : undefined,
      });
    } catch {
      toast.error(`Couldn't download ${stem.name}.`, {
        description: "Something went wrong. Try again.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleDownloadAll = async () => {
    setAllPending(true);
    try {
      const count = await downloadAll(project);
      toast.success(`Downloading ${count} files.`, {
        description: IS_SIMULATED_DOWNLOAD ? SIMULATED_NOTE : undefined,
      });
    } catch {
      toast.error("Couldn't download everything.", {
        description: "Some files may not have started. Try again.",
      });
    } finally {
      setAllPending(false);
    }
  };

  return (
    <Card className="gap-0 overflow-hidden pb-0">
      <CardHeader className="pb-5">
        <CardTitle className="text-base">Your track is ready</CardTitle>
        <CardDescription>
          {stemCount > 0
            ? `${stemCount} separated ${stemCount === 1 ? "stem" : "stems"} and an enhanced master.`
            : "Your enhanced master is ready to download."}
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={busy}
            aria-label={`Download all ${files.length} files`}
          >
            {allPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Download aria-hidden />
            )}
            {/* The full label crowds the title at 360px. */}
            <span className="sm:hidden">All ({files.length})</span>
            <span className="hidden sm:inline">
              Download all ({files.length})
            </span>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
        <ul className="divide-y border-t">
          {files.map((stem) => (
            <DeliveryRow
              key={stem.id}
              stem={stem}
              pending={pendingId === stem.id}
              disabled={busy && pendingId !== stem.id}
              onDownload={() => handleDownload(stem)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
