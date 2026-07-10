"use client";

// KN-43 — Download & delivery.  ·  KN-44 — Audio player.
//
// The payoff screen: everything a completed project produced, auditionable and
// downloadable. Two transports live here and only one may sound at a time:
//
//   • MasterPlayer — the enhanced master, played exclusively
//   • StemMixer    — the separated stems, played together on one clock
//
// The master is the sum of the stems, so playing both would double the mix. This
// component owns which of the two holds the floor; each yields when it doesn't.
//
// Download transport lives behind the `Downloader` seam (lib/download) and audio
// behind the `AudioSource` seam (lib/audio), so the whole screen — playback and
// downloads alike — runs with no backend.

import * as React from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { DeliveryEmpty } from "@/components/delivery/delivery-empty";
import { MasterPlayer } from "@/components/delivery/master-player";
import { StemMixer } from "@/components/delivery/stem-mixer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IS_SIMULATED_AUDIO } from "@/lib/audio/audio-source";
import { downloadFilename, splitDeliverables } from "@/lib/delivery/deliverables";
import { downloadAll } from "@/lib/download/download-all";
import {
  IS_SIMULATED_DOWNLOAD,
  downloadFile,
} from "@/lib/download/download-file";
import { useStemMixer } from "@/lib/hooks/use-stem-mixer";
import type { Project, Stem } from "@/lib/types";

/** Appended to success toasts when no backend is wired, so we don't claim a file landed. */
const SIMULATED_NOTE = "Simulated — connect a backend to fetch real audio.";

/** Which transport currently holds the floor. */
type Transport = "master" | "mixer" | null;

export function DeliveryPanel({ project }: { project: Project }) {
  const { master, stems } = React.useMemo(
    () => splitDeliverables(project),
    [project],
  );

  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [allPending, setAllPending] = React.useState(false);
  const [active, setActive] = React.useState<Transport>(null);
  const busy = allPending || pendingId !== null;

  const laneIds = React.useMemo(() => stems.map((s) => s.id), [stems]);
  const mixer = useStemMixer(laneIds);

  const fileCount = stems.length + (master ? 1 : 0);

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

  if (fileCount === 0) return <DeliveryEmpty />;

  return (
    <Card className="gap-0 overflow-hidden pb-0">
      <CardHeader className="pb-5">
        <CardTitle className="text-base">Your track is ready</CardTitle>
        <CardDescription>
          {stems.length > 0
            ? `${stems.length} separated ${stems.length === 1 ? "stem" : "stems"} and an enhanced master.`
            : "Your enhanced master is ready to download."}
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={busy}
            aria-label={`Download all ${fileCount} files`}
          >
            {allPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Download aria-hidden />
            )}
            {/* The full label crowds the title at 360px. */}
            <span className="sm:hidden">All ({fileCount})</span>
            <span className="hidden sm:inline">Download all ({fileCount})</span>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
        <div className="border-t">
          {master && (
            <MasterPlayer
              stem={master}
              suspended={active === "mixer"}
              onActivate={() => setActive("master")}
              pending={pendingId === master.id}
              downloadsDisabled={busy && pendingId !== master.id}
              onDownload={() => handleDownload(master)}
            />
          )}

          {stems.length > 0 && (
            <StemMixer
              stems={stems}
              mixer={mixer}
              suspended={active === "master"}
              onActivate={() => setActive("mixer")}
              pendingId={pendingId}
              downloadsDisabled={busy}
              onDownload={handleDownload}
            />
          )}
        </div>

        {IS_SIMULATED_AUDIO && (
          <p className="text-muted-foreground border-t px-4 py-2.5 text-center text-xs">
            Playback is silent — no audio backend is connected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
