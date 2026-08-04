"use client";

// Side-by-side comparison of the two separation engines.
//
// Only rendered when a project holds output from both, which happens while the v2
// engine is rolling out. The question it exists to answer is narrow and audible:
// *for this instrument, which model separated it better?*
//
// Three decisions shape the whole screen:
//
//   • One stem at a time. Both versions of the selected stem are mounted and
//     playing; switching moves mute flags only. See lib/hooks/use-ab-compare for
//     why that matters more than anything else here.
//   • Position survives a stem change. Pick the chorus on the vocal, switch to
//     drums, and you are still at the chorus — otherwise every comparison restarts
//     from silence and you spend the session scrubbing.
//   • Blind by default is *not* the choice made here: labels are shown, with a
//     blind toggle. Hiding them by default would confuse the common case (a user
//     who just wants the better file) to serve the rarer one (judging the model).

import * as React from "react";
import { EyeOff, LoaderCircle, Pause, Play, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AbSwitch } from "@/components/delivery/ab-switch";
import { CompareStemRow } from "@/components/delivery/compare-stem-row";
import { DownloadButton } from "@/components/delivery/download-button";
import { WaveformCanvas } from "@/components/delivery/waveform-canvas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  ENGINE_VERSION_META,
  comparisonRows,
  configSummary,
  orderedVersions,
} from "@/lib/delivery/comparison";
import { downloadFilename, stemDetails } from "@/lib/delivery/deliverables";
import {
  IS_SIMULATED_DOWNLOAD,
  downloadFile,
} from "@/lib/download/download-file";
import { laneId, useAbCompare } from "@/lib/hooks/use-ab-compare";
import { useStemComparison } from "@/lib/query/comparison";
import { formatDuration } from "@/lib/format";
import type { EngineVersion, Project, Stem, StemComparison } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Taller than a mixer lane — this waveform is the thing being examined. */
const COMPARE_HEIGHT = 56;

export function VersionComparePanel({ project }: { project: Project }) {
  const { data: comparison, isLoading, isError } = useStemComparison(project.id);

  // Nothing to compare is the normal case outside the rollout, and it is not an
  // error — render nothing rather than an empty card taking up the page.
  if (isLoading || isError || !comparison) return null;
  if (comparison.versions.length < 2) return null;

  return <CompareCard project={project} comparison={comparison} />;
}

function CompareCard({
  project,
  comparison,
}: {
  project: Project;
  comparison: StemComparison;
}) {
  const versions = React.useMemo(
    () => orderedVersions(comparison),
    [comparison],
  );
  const rows = React.useMemo(() => comparisonRows(comparison), [comparison]);
  const versionIds = React.useMemo(
    () => versions.map((v) => v.version),
    [versions],
  );

  const comparable = React.useMemo(
    () => rows.filter((row) => row.comparable),
    [rows],
  );
  const [selected, setSelected] = React.useState<string | null>(
    () => comparable[0]?.name ?? null,
  );

  // The two lanes currently mounted. A module-stable empty array would still be a
  // new identity each render if inlined, and this feeds `ready`.
  const laneIds = React.useMemo(
    () => (selected ? versionIds.map((v) => laneId(v, selected)) : []),
    [versionIds, selected],
  );

  const ab = useAbCompare({ versions: versionIds, laneIds });

  const [blind, setBlind] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const row = comparable.find((r) => r.name === selected) ?? null;
  const stillRendering = versions.filter((v) => v.state === "processing");
  const failed = versions.filter((v) => v.state === "failed");

  // Carry the playhead across a stem change. Selecting a different stem tears down
  // both lanes and builds two new ones, which would otherwise drop the user back to
  // 0:00 — losing the exact moment they were listening to.
  const resumeAtRef = React.useRef(0);
  React.useEffect(() => {
    if (ab.currentTime > 0) resumeAtRef.current = ab.currentTime;
  }, [ab.currentTime]);

  const { ready, seek } = ab;
  React.useEffect(() => {
    if (!ready || resumeAtRef.current <= 0) return;
    seek(resumeAtRef.current);
  }, [ready, seek, selected]);

  const handleSelect = React.useCallback((stemName: string) => {
    setSelected(stemName);
  }, []);

  const handleDownload = async (version: EngineVersion, stem: Stem) => {
    setPendingId(stem.id);
    try {
      const base = downloadFilename(project, stem);
      await downloadFile({
        // Both versions produce `…-vocals.wav`; without the version in the name the
        // second download silently overwrites the first in the user's folder.
        url: stem.url,
        filename: base.replace(/(\.[^.]+)$/, `-${version}$1`),
      });
      toast.success(`${stem.name} (${ENGINE_VERSION_META[version].label}) — download started.`, {
        description: IS_SIMULATED_DOWNLOAD
          ? "Simulated — connect a backend to fetch real audio."
          : undefined,
      });
    } catch {
      toast.error(`Couldn't download ${stem.name}.`, {
        description: "Something went wrong. Try again.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const total = ab.duration || row?.takes.v1?.durationSec || project.durationSec;

  return (
    <Card className="gap-0 overflow-hidden pb-0">
      <CardHeader className="pb-5">
        <CardTitle className="flex items-center gap-2 text-base">
          Compare versions
          <Badge variant="secondary" className="text-[10px]">
            Beta
          </Badge>
        </CardTitle>
        <CardDescription>
          We separated this track with two models. Both play on the same playhead —
          switch between them to hear the difference.
        </CardDescription>
        <CardAction>
          <Button
            variant={blind ? "default" : "outline"}
            size="sm"
            aria-pressed={blind}
            onClick={() => setBlind((prev) => !prev)}
          >
            <EyeOff aria-hidden />
            <span className="hidden sm:inline">Blind test</span>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
        {stillRendering.length > 0 && (
          <div className="border-t px-4 py-3">
            <Alert>
              <LoaderCircle className="animate-spin" />
              <AlertDescription>
                {blind
                  ? "One version is still rendering."
                  : `${stillRendering.map((v) => ENGINE_VERSION_META[v.version].label).join(" and ")} ${stillRendering.length === 1 ? "is" : "are"} still rendering — this page updates when done.`}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {failed.length > 0 && (
          <div className="border-t px-4 py-3">
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>
                {blind
                  ? "One version failed to render."
                  : `${failed.map((v) => ENGINE_VERSION_META[v.version].label).join(" and ")} failed to render. Your other version is unaffected.`}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Transport + the A/B switch: the two controls a comparison actually needs. */}
        <div className="bg-muted/30 flex flex-wrap items-center gap-x-3 gap-y-3 border-t px-4 py-3">
          <Button
            type="button"
            size="icon"
            onClick={ab.toggle}
            disabled={!ab.ready || !row}
            aria-label={ab.playing ? "Pause comparison" : "Play comparison"}
            className="size-9 rounded-full"
          >
            {row && !ab.ready ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : ab.playing ? (
              <Pause className="fill-current" aria-hidden />
            ) : (
              <Play className="translate-x-px fill-current" aria-hidden />
            )}
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {row ? row.label : "No comparable stem"}
              {!blind && row && (
                <span className="text-muted-foreground font-normal">
                  {" · "}
                  {ENGINE_VERSION_META[ab.active].label}
                </span>
              )}
            </p>
            <p className="text-muted-foreground font-mono text-xs tabular-nums">
              {formatDuration(ab.currentTime)} / {formatDuration(total)}
            </p>
          </div>

          <AbSwitch
            versions={versionIds}
            active={ab.active}
            blind={blind}
            disabled={!row}
            onSelect={ab.setActive}
          />
        </div>

        {/* Both takes, stacked. Both are mounted and playing whichever is audible —
            that is what makes the switch instant, and it also lets the user *see*
            the difference (a cleaner separation shows less between phrases). */}
        {row ? (
          <div className="space-y-3 border-t px-4 py-3.5">
            {versions.map((version, index) => {
              const take = row.takes[version.version];
              const meta = ENGINE_VERSION_META[version.version];
              const isActive = version.version === ab.active;
              if (!take) return null;
              return (
                <div key={version.version}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => ab.setActive(version.version)}
                      className={cn(
                        "focus-visible:ring-ring/60 flex min-w-0 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2",
                        !isActive && "opacity-60 hover:opacity-100",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded font-mono text-[10px] font-semibold",
                          isActive ? meta.softBg : "bg-muted",
                          isActive && meta.text,
                        )}
                      >
                        {meta.initial}
                      </span>
                      <span className="truncate text-xs font-medium">
                        {blind ? `Version ${meta.initial}` : meta.label}
                      </span>
                      {isActive && (
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                          playing
                        </span>
                      )}
                    </button>

                    <div className="ml-auto shrink-0">
                      <DownloadButton
                        stem={take}
                        details={stemDetails(take)}
                        pending={pendingId === take.id}
                        disabled={pendingId !== null && pendingId !== take.id}
                        qualifier={blind ? `version ${meta.initial}` : meta.label}
                        onDownload={() => handleDownload(version.version, take)}
                      />
                    </div>
                  </div>

                  <WaveformCanvas
                    stem={take}
                    height={COMPARE_HEIGHT}
                    currentTime={ab.currentTime}
                    duration={ab.duration}
                    peakVariant={index}
                    label={`Seek ${row.label}, version ${meta.initial}`}
                    onInstance={(ws) =>
                      ab.registerLane(laneId(version.version, row.name), ws)
                    }
                    onSeek={ab.seek}
                    className={cn(
                      "transition-opacity",
                      !isActive && "opacity-45",
                    )}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground border-t px-4 py-6 text-center text-sm">
            No stem was produced by both versions, so there is nothing to compare
            side by side.
          </p>
        )}

        <div className="border-t">
          <p className="text-muted-foreground px-4 pt-3 pb-1 text-xs font-medium">
            Choose a stem
          </p>
          <ul className="divide-y">
            {rows.map((item) => (
              <CompareStemRow
                key={item.name}
                row={item}
                selected={item.name === selected}
                blind={blind}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        </div>

        {!blind && (
          <dl className="text-muted-foreground grid gap-1 border-t px-4 py-3 text-xs">
            {versions.map((version) => {
              const summary = configSummary(version.config);
              if (summary.length === 0) return null;
              return (
                <div key={version.version} className="flex flex-wrap gap-x-2">
                  <dt className="font-medium">
                    {ENGINE_VERSION_META[version.version].label}
                    <span className="font-mono"> ({version.version})</span>
                  </dt>
                  {/* Wraps rather than truncates: on a 375px screen the model list is
                      wider than the card, and a clipped "Vocals: mel_band_rofor…" is
                      exactly the detail someone opened this line to read. */}
                  <dd className="min-w-0 break-words">{summary.join(" · ")}</dd>
                </div>
              );
            })}
          </dl>
        )}

        {IS_SIMULATED_AUDIO && (
          <p className="text-muted-foreground border-t px-4 py-2.5 text-center text-xs">
            Playback is silent and both versions are simulated — no audio backend is
            connected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
