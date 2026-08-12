"use client";

// The visual comparison shown once a run finishes: waveform lanes and spectra for
// Original / Version 2 / Version 3.
//
// This component owns the decode lifecycle. The work is genuinely expensive — up
// to three multi-megabyte files fetched, decoded and transformed — so it is
// deliberately *not* started until the run is complete and there is something to
// compare. Analysing V2 the moment it lands would compete with the V3 job for the
// user's bandwidth while they are still waiting on it.
//
// Everything degrades to nothing: a source that fails to fetch or decode drops
// out of the comparison and the rest still draws. A restoration whose plots are
// missing is a smaller loss than a results page that throws.

import * as React from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import {
  SpectrumCompare,
  SERIES_COLORS,
  type SpectrumSeries,
} from "@/components/restoration/spectrum-compare";
import {
  WaveformCompare,
  type WaveformLane,
} from "@/components/restoration/waveform-compare";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  analyseAudio,
  fetchUrl,
  readFile,
  type AudioAnalysis,
} from "@/lib/audio/analysis";

export interface ComparisonSource {
  key: "original" | "v2" | "v3";
  label: string;
  /** The uploaded file, for the original — read locally, never re-downloaded. */
  file?: File | null;
  /** A signed URL, for a stage output. */
  url?: string | null;
}

type State =
  | { status: "loading" }
  | { status: "ready"; results: { source: ComparisonSource; analysis: AudioAnalysis }[] }
  | { status: "error"; message: string };

export function ResultCompare({ sources }: { sources: ComparisonSource[] }) {
  // Stored with the signature it belongs to, and matched during render rather
  // than reset from inside the effect. A `setState` in an effect body to clear
  // stale results would cascade an extra render on every new run — and "which run
  // is this result for" is derivable, so it does not need to be synchronised.
  const [done, setDone] = React.useState<{ signature: string; state: State } | null>(null);

  const usable = sources.filter((s) => s.file || s.url);

  // Keyed by what actually identifies the audio, so a re-render with the same run
  // does not re-decode, but a *new* run does. Re-signing the same output key mints
  // a different URL, so the key must not be the URL — it would look like new audio
  // every time the page refreshed a signature.
  const signature = usable
    .map((s) => `${s.key}:${s.file?.name ?? ""}:${s.file?.size ?? ""}:${urlKey(s.url)}`)
    .join("|");

  const state: State = done?.signature === signature ? done.state : { status: "loading" };

  React.useEffect(() => {
    // One lane is not a comparison.
    if (usable.length < 2) return;

    let alive = true;

    Promise.all(
      usable.map(async (source) => {
        try {
          const key = source.file
            ? `file:${source.file.name}:${source.file.size}:${source.file.lastModified}`
            : `url:${urlKey(source.url)}`;
          const load = source.file ? readFile(source.file) : fetchUrl(source.url!);
          return { source, analysis: await analyseAudio(key, load) };
        } catch {
          // Dropped rather than fatal — see the header note.
          return null;
        }
      }),
    ).then((all) => {
      if (!alive) return;
      const results = all.filter((r): r is NonNullable<typeof r> => r !== null);
      setDone({
        signature,
        state:
          results.length >= 2
            ? { status: "ready", results }
            : {
                status: "error",
                message:
                  "The rendered audio could not be read back for comparison. The players above still work.",
              },
      });
    });

    return () => {
      alive = false;
    };
    // `signature` is the real dependency; `usable` is a fresh array every render
    // and is fully described by it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (usable.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compare the versions</CardTitle>
        <CardDescription>
          Measured in your browser from the rendered audio — the same two views the
          engine team reads. The metrics say what each stage decided; these say what
          it did to the signal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {state.status === "loading" && (
          <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Decoding and measuring the renders…
          </div>
        )}

        {state.status === "error" && (
          <Alert>
            <CircleAlert />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state.status === "ready" && (
          <>
            <WaveformCompare
              lanes={state.results.map(
                ({ source, analysis }): WaveformLane => ({
                  key: source.key,
                  label: source.label,
                  analysis,
                }),
              )}
            />
            <SpectrumCompare
              series={state.results.map(
                ({ source, analysis }): SpectrumSeries => ({
                  key: source.key,
                  label: source.label,
                  color: SERIES_COLORS[source.key],
                  analysis,
                }),
              )}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** The stable part of a signed URL: everything before the query string.
 *
 *  Signatures are minted per request and expire, so the full URL changes on every
 *  poll even when the object behind it has not. Keying a cache on it would decode
 *  the same file repeatedly. */
function urlKey(url: string | null | undefined): string {
  if (!url) return "";
  const cut = url.indexOf("?");
  return cut === -1 ? url : url.slice(0, cut);
}
