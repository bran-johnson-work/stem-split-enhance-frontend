"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCw,
  ShieldAlert,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  demoDisplayHost,
  demoEmbedUrl,
  demoExternalUrl,
  isDemoBlockedByMixedContent,
} from "@/lib/config";
import { cn } from "@/lib/utils";

/** Never-changing store: the "is this the browser?" answer only differs by env. */
const noopSubscribe = () => () => {};

/**
 * Embeds the public Streamlit demo in a framed panel with its own toolbar
 * (reload / fullscreen / open in a new tab).
 *
 * Two behaviours are deliberate:
 * - The `src` is only set after mount. Server-rendering it would start the
 *   Streamlit websocket handshake before we know the page protocol, and the
 *   mixed-content check below can only run in the browser.
 * - Reload bumps a `reloadKey` used as the iframe `key` rather than poking
 *   `contentWindow.location`, which a cross-origin frame forbids.
 */
export function DemoEmbed({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // false on the server, true once hydrated — without the extra render an
  // effect + setState would cost.
  const onClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  // Track fullscreen from the document, not from our click handler — the user
  // can also leave with Esc, which never routes through the button.
  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen?.();
    }
  }, []);

  const reload = useCallback(() => {
    setLoaded(false);
    setReloadKey((k) => k + 1);
  }, []);

  const blocked = onClient && isDemoBlockedByMixedContent();

  if (blocked) {
    return (
      <Alert className={cn("mx-auto max-w-2xl", className)}>
        <ShieldAlert />
        <AlertTitle>The demo can&apos;t be embedded on a secure page</AlertTitle>
        <AlertDescription>
          <p>
            This site is served over HTTPS and the demo host is plain HTTP, so
            your browser blocks it from loading in a frame. It still works in
            its own tab.
          </p>
          <Button className="mt-2" asChild>
            <a href={demoExternalUrl()} target="_blank" rel="noreferrer noopener">
              Open the demo
              <ExternalLink />
            </a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-card border-border/60 flex flex-col overflow-hidden rounded-xl border shadow-sm",
        // In fullscreen the element is the viewport, so drop the rounding and
        // let the frame take all of the height.
        fullscreen && "rounded-none",
        className,
      )}
    >
      {/* toolbar */}
      <div className="border-border/60 bg-muted/40 flex items-center gap-2 border-b px-3 py-2">
        <span className="flex items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </span>
        <span className="text-muted-foreground ml-2 truncate font-mono text-xs">
          {demoDisplayHost()}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={reload}
            aria-label="Reload the demo"
            title="Reload"
          >
            <RotateCw />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={demoExternalUrl()} target="_blank" rel="noreferrer noopener">
              <ExternalLink />
              <span className="hidden sm:inline">New tab</span>
            </a>
          </Button>
        </div>
      </div>

      {/* frame */}
      <div
        className={cn(
          "relative w-full",
          fullscreen ? "flex-1" : "h-[70vh] min-h-[520px]",
        )}
      >
        {/* Opaque overlay above the iframe, not a fade on the iframe itself:
            the frame is either fully covered or fully shown, so there is no
            state where a half-painted Streamlit boot is visible. */}
        {!loaded ? (
          <div className="bg-card absolute inset-0 z-10 flex flex-col gap-4 p-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="flex-1 w-full" />
            <p className="text-muted-foreground text-center text-sm">
              Waking the demo up — this can take a few seconds on a cold start.
            </p>
          </div>
        ) : null}

        {onClient ? (
          <iframe
            key={reloadKey}
            src={demoEmbedUrl()}
            title="KlearNote audio separation and enhancement demo"
            onLoad={() => setLoaded(true)}
            allow="microphone; clipboard-write; fullscreen"
            className="h-full w-full border-0"
          />
        ) : null}
      </div>
    </div>
  );
}
