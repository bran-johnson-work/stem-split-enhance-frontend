"use client";

// A project finished processing but has nothing attached to download.
//
// This is the *normal* state against the real backend today: stem separation is
// out of scope for Dakota's API (see docs/API doc.yaml — `ProjectStatus`), and
// `mapProject` therefore always returns `stems: []`. Rather than imply the files
// are missing, say which world we're in.

import { FileAudio } from "lucide-react";
import { USE_REAL_BACKEND } from "@/lib/config";

export function DeliveryEmpty() {
  return (
    <div className="bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
      <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
        <FileAudio className="size-6" />
      </div>
      <p className="font-medium">Nothing to download yet</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        {USE_REAL_BACKEND
          ? "Processing finished, but this backend doesn't return stems yet — separated tracks and the enhanced master will appear here once the separation service ships."
          : "Processing finished, but no stems or enhanced master were attached to this project."}
      </p>
    </div>
  );
}
