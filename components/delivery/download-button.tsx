"use client";

// The per-file download control, shared by the stem lanes and the master player.
// Purely presentational: the panel owns the pending state and the download call.

import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Stem } from "@/lib/types";

export function DownloadButton({
  stem,
  details,
  pending,
  disabled,
  emphasized,
  onDownload,
}: {
  stem: Stem;
  /** Format/size/duration, folded into the accessible name. */
  details: string[];
  /** This file's own download is in flight. */
  pending: boolean;
  /** Another download holds the transport. */
  disabled: boolean;
  /** The master gets the solid treatment; stems are outlined. */
  emphasized?: boolean;
  onDownload: () => void;
}) {
  return (
    <Button
      variant={emphasized ? "default" : "outline"}
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
  );
}
