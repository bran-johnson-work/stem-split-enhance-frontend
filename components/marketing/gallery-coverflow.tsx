"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 3D coverflow carousel for the "A look inside KlearNote" section.
 *
 * The active screenshot sits centred, large and sharp; its neighbours recede
 * in perspective — scaled down, tilted on the Y axis, blurred and dimmed — so
 * the eye lands on one screen at a time. It auto-advances, pauses on hover /
 * focus, and can be driven by the arrows, the dots, swipe/drag, or the
 * ← / → keys. All motion is transform/opacity only (GPU-friendly) and is
 * disabled under `prefers-reduced-motion` (no autoplay, no transitions).
 *
 * Captions turn the anonymous screenshots into a guided product tour — edit
 * the `slides` array to retitle a screen (files live in /public/gallery).
 */
const slides = [
  {
    src: "/gallery/1.jpg",
    title: "Real-time processing",
    caption: "Watch every stage — analyzing to mastered — happen live.",
  },
  {
    src: "/gallery/2.jpg",
    title: "Clean stem separation",
    caption: "Vocals, drums, bass and more, pulled into isolated tracks.",
  },
  {
    src: "/gallery/3.jpg",
    title: "Enhanced mastering",
    caption: "A studio-grade master applied automatically to every upload.",
  },
  {
    src: "/gallery/4.png",
    title: "Your library",
    caption: "Every track and its stems, organised and ready to revisit.",
  },
  {
    src: "/gallery/5.jpg",
    title: "Waveform detail",
    caption: "Inspect each stem down to the transient before you export.",
  },
  {
    src: "/gallery/6.jpg",
    title: "Lossless downloads",
    caption: "Grab individual stems or the full master in WAV or MP3.",
  },
  {
    src: "/gallery/7.jpg",
    title: "Built for AI audio",
    caption: "Tuned for the artifacts and quirks of AI-generated tracks.",
  },
  {
    src: "/gallery/8.jpg",
    title: "Track your progress",
    caption: "Follow each job from queued to completed at a glance.",
  },
  {
    src: "/gallery/9.jpg",
    title: "Yours to keep",
    caption: "Your audio and outputs stay private and downloadable anytime.",
  },
];

const AUTOPLAY_MS = 4500;
const SWIPE_THRESHOLD = 40; // px of horizontal travel that counts as a swipe

/** Per-tier depth for a card at `offset` steps from the active slide. */
function slideStyle(offset: number): React.CSSProperties {
  const abs = Math.abs(offset);
  const sign = Math.sign(offset);

  // Only the active card + two neighbours each side are shown; the rest are
  // parked, faded out and non-interactive so the loop stays cheap.
  if (abs > 2) {
    return {
      transform: "translate(-50%, -50%) scale(0.5)",
      opacity: 0,
      zIndex: 0,
      pointerEvents: "none",
    };
  }

  const x = offset === 0 ? 0 : sign * (abs === 1 ? 58 : 104);
  const scale = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.64;
  const rotateY = offset === 0 ? 0 : -sign * (abs === 1 ? 22 : 28);
  const opacity = abs === 0 ? 1 : abs === 1 ? 0.65 : 0.35;
  const blur = abs === 0 ? 0 : abs === 1 ? 2 : 4;

  return {
    transform: `translate(-50%, -50%) translateX(${x}%) scale(${scale}) rotateY(${rotateY}deg)`,
    opacity,
    zIndex: 30 - abs * 10,
    filter: blur ? `blur(${blur}px)` : undefined,
  };
}

export function GalleryCoverflow() {
  const n = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  const pointer = useRef({ startX: 0, down: false, moved: false });
  const justDragged = useRef(false);

  const go = (dir: 1 | -1) => setActive((a) => (a + dir + n) % n);
  const next = () => go(1);
  const prev = () => go(-1);

  // Honour reduced-motion: no autoplay, no transitions (below).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Auto-advance while idle.
  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % n), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, reduced, n]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pointer.current = { startX: e.clientX, down: true, moved: false };
    justDragged.current = false;
    setPaused(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointer.current.down) return;
    if (Math.abs(e.clientX - pointer.current.startX) > 8) pointer.current.moved = true;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointer.current.down) return;
    const dx = e.clientX - pointer.current.startX;
    pointer.current.down = false;
    setPaused(false);
    if (pointer.current.moved) {
      // Suppress the click that fires after a drag so it can't re-select a card.
      justDragged.current = true;
      if (dx > SWIPE_THRESHOLD) prev();
      else if (dx < -SWIPE_THRESHOLD) next();
    }
  }

  const current = slides[active];

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="A look inside KlearNote"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          prev();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          next();
        }
      }}
      className="relative mx-auto max-w-5xl"
    >
      {/* soft brand glow behind the stage */}
      <div
        aria-hidden
        className="bg-aurora pointer-events-none absolute inset-0 -z-10 scale-90 opacity-40 blur-2xl dark:opacity-50"
      />

      {/* stage — arrows live outside so the edge fade doesn't dim them */}
      <div className="relative">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="mask-fade-x relative h-[clamp(11rem,44vw,20rem)] touch-pan-y [perspective:1200px]"
        >
          {slides.map((slide, i) => {
            let offset = i - active;
            if (offset > n / 2) offset -= n;
            if (offset < -n / 2) offset += n;
            const isActive = offset === 0;
            const hidden = Math.abs(offset) > 2;

            return (
              <button
                key={slide.src}
                type="button"
                tabIndex={hidden || isActive ? -1 : 0}
                aria-hidden={hidden}
                aria-label={`Show ${slide.title}`}
                onClick={() => {
                  if (justDragged.current) return;
                  setActive(i);
                }}
                style={slideStyle(offset)}
                className={cn(
                  "bg-muted absolute top-1/2 left-1/2 w-[70vw] max-w-[34rem] overflow-hidden rounded-2xl border shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)] transition-[transform,opacity,filter] duration-500 ease-out will-change-transform select-none sm:w-[26rem] lg:w-[34rem] motion-reduce:transition-none",
                  isActive ? "ring-brand/60 cursor-default ring-2" : "cursor-pointer",
                )}
              >
                <span className="relative block aspect-video">
                  <Image
                    src={slide.src}
                    alt={slide.title}
                    fill
                    draggable={false}
                    sizes="(min-width: 1024px) 544px, (min-width: 640px) 416px, 70vw"
                    className="pointer-events-none object-cover"
                  />
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={prev}
          aria-label="Previous screenshot"
          className="bg-card/90 text-foreground hover:text-brand focus-visible:ring-ring absolute top-1/2 left-1 z-40 grid size-11 -translate-y-1/2 place-items-center rounded-full border shadow-md backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none sm:left-2"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next screenshot"
          className="bg-card/90 text-foreground hover:text-brand focus-visible:ring-ring absolute top-1/2 right-1 z-40 grid size-11 -translate-y-1/2 place-items-center rounded-full border shadow-md backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none sm:right-2"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* caption — announced politely as the active slide changes */}
      <div aria-live="polite" aria-atomic className="mt-8 text-center">
        <div
          key={active}
          className="animate-in fade-in slide-in-from-bottom-1 duration-500 motion-reduce:animate-none"
        >
          <h3 className="text-lg font-semibold tracking-tight">{current.title}</h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm text-pretty">
            {current.caption}
          </p>
        </div>
      </div>

      {/* dots */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Go to ${slide.title}`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "h-2.5 rounded-full transition-all duration-300",
              i === active
                ? "bg-brand-gradient w-6"
                : "bg-border hover:bg-muted-foreground/50 w-2.5",
            )}
          />
        ))}
      </div>
    </div>
  );
}
