"use client";

// Original / Version 2 / Version 3, side by side.
//
// Mirrors the "Audition each version" row in the pipeline's own Streamlit view,
// because a restoration is only judged by ear: the metrics say what changed, not
// whether it sounds better. Three plain <audio> elements rather than the stem
// mixer — the mixer synchronises N lanes of one track, but these are three whole
// renders of the same audio and the point is to switch between them, not to hear
// them at once.
//
// Each player pauses the others on play, so a click always replaces what you are
// hearing instead of layering onto it.

import * as React from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface AuditionTrack {
  key: string;
  label: string;
  /** Null while the stage that produces it is still running or was skipped. */
  url: string | null;
  caption: string;
  /** Shown instead of a player when there is no audio yet. */
  placeholder?: string;
}

export function AuditionPanel({
  tracks,
  filename,
}: {
  tracks: AuditionTrack[];
  filename: string;
}) {
  // One ref per player so playing any of them can pause the rest.
  const players = React.useRef(new Map<string, HTMLAudioElement>());

  const register = React.useCallback((key: string, el: HTMLAudioElement | null) => {
    if (el) players.current.set(key, el);
    else players.current.delete(key);
  }, []);

  const soloOnPlay = React.useCallback((key: string) => {
    players.current.forEach((el, otherKey) => {
      if (otherKey !== key && !el.paused) el.pause();
    });
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tracks.map((track) => (
        <Card key={track.key} className="flex flex-col">
          <CardContent className="flex flex-1 flex-col gap-3 pt-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{track.label}</span>
              {track.url && track.key !== "original" && (
                <Badge variant="secondary" className="text-xs">
                  restored
                </Badge>
              )}
            </div>

            {track.url ? (
              <>
                {/* Native controls on purpose: this is a comparison, not a
                    designed transport, and the browser's own scrubber is the
                    one users already know. */}
                <audio
                  ref={(el) => register(track.key, el)}
                  onPlay={() => soloOnPlay(track.key)}
                  src={track.url}
                  controls
                  preload="metadata"
                  className="w-full"
                  aria-label={`${track.label} of ${filename}`}
                />
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="text-muted-foreground text-xs">{track.caption}</span>
                  <Button asChild variant="outline" size="sm">
                    {/* A cross-origin signed S3 URL ignores `download`, so this
                        opens the file rather than renaming it — still the fastest
                        path to saving one, and honest about what it does. */}
                    <a href={track.url} target="_blank" rel="noreferrer">
                      <Download className="size-4" />
                      Open
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="border-muted text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed p-6 text-center text-xs">
                {track.placeholder ?? "Not available yet."}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
