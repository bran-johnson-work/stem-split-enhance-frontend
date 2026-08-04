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
  qualifier,
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
  /**
   * Disambiguates two buttons for the same stem. The comparison screen shows both
   * versions of one stem side by side, so without this a screen-reader user hears
   * "Download Vocals" twice with no way to tell which model's take they'd get.
   */
  qualifier?: string;
  onDownload: () => void;
}) {
  const name = qualifier ? `${stem.name}, ${qualifier}` : stem.name;
  return (
    <Button
      variant={emphasized ? "default" : "outline"}
      size="sm"
      onClick={onDownload}
      disabled={pending || disabled}
      aria-label={`Download ${name} (${details.join(", ")})`}
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
