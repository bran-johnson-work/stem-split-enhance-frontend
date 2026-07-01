"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Infinite, manually-scrollable image strip — drag with the mouse, swipe
 * on touch, or use a trackpad. The images are rendered in several
 * identical copies; as the user scrolls past a copy we silently shift
 * `scrollLeft` by exactly one copy's width, so the strip loops endlessly
 * with no visible seam. Releasing a mouse drag throws the strip with
 * smooth momentum that eases to a stop. The native scrollbar is hidden
 * (`no-scrollbar`) and the edges fade out (`mask-fade-x`, the same fade as
 * the "Trusted by" logos strip).
 *
 * To change the images, edit this array (files live in /public/gallery).
 */
const images = [
  { src: "/gallery/1.jpg", alt: "KlearNote gallery image 1" },
  { src: "/gallery/2.jpg", alt: "KlearNote gallery image 2" },
  { src: "/gallery/3.jpg", alt: "KlearNote gallery image 3" },
  { src: "/gallery/4.png", alt: "KlearNote gallery image 4" },
  { src: "/gallery/5.jpg", alt: "KlearNote gallery image 5" },
  { src: "/gallery/6.jpg", alt: "KlearNote gallery image 6" },
  { src: "/gallery/7.jpg", alt: "KlearNote gallery image 7" },
  { src: "/gallery/8.jpg", alt: "KlearNote gallery image 8" },
  { src: "/gallery/9.jpg", alt: "KlearNote gallery image 9" },
];

const COPIES = 3;
const FRICTION = 0.94; // velocity retained per frame after release
const MIN_VELOCITY = 0.02; // px/ms — below this momentum stops
const MOMENTUM_SCALE = 0.6; // dampen the throw so the strip coasts slower

export function ImageScroller() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLUListElement>(null);
  const drag = useRef({ active: false, lastX: 0, lastT: 0, velocity: 0 });
  const raf = useRef<number | null>(null);

  // Start in the middle copy so there's content to scroll into on both
  // sides. Copy 0 and copy 1 are pixel-identical, so jumping from
  // scrollLeft 0 -> one copy width is visually seamless (no flash).
  useEffect(() => {
    const el = scrollRef.current;
    const group = groupRef.current;
    if (el && group) el.scrollLeft = group.offsetWidth;
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  function loopCorrect() {
    const el = scrollRef.current;
    const group = groupRef.current;
    if (!el || !group) return;
    const set = group.offsetWidth;
    if (set <= 0) return;
    // Keep the position within the middle band; correct by whole copies
    // (content is identical every `set` px, so the shift is invisible).
    if (el.scrollLeft < set * 0.5) el.scrollLeft += set;
    else if (el.scrollLeft > set * 1.5) el.scrollLeft -= set;
  }

  function stopMomentum() {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }

  function startMomentum() {
    const el = scrollRef.current;
    if (!el) return;
    let velocity = drag.current.velocity * MOMENTUM_SCALE; // px/ms
    if (Math.abs(velocity) <= MIN_VELOCITY) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      el.scrollLeft -= velocity * dt;
      velocity *= FRICTION;
      raf.current =
        Math.abs(velocity) > MIN_VELOCITY ? requestAnimationFrame(step) : null;
    };
    raf.current = requestAnimationFrame(step);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Touch / pen already scroll natively — only drive drag for the mouse.
    if (e.pointerType === "touch") return;
    const el = scrollRef.current;
    if (!el) return;
    stopMomentum();
    drag.current = {
      active: true,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    el.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const now = performance.now();
    const dx = e.clientX - drag.current.lastX;
    const dt = now - drag.current.lastT;
    // Incremental delta — immune to the loop's scrollLeft corrections.
    el.scrollLeft -= dx;
    if (dt > 0) drag.current.velocity = dx / dt;
    drag.current.lastX = e.clientX;
    drag.current.lastT = now;
  }

  function endDrag() {
    if (!drag.current.active) return;
    drag.current.active = false;
    startMomentum();
  }

  return (
    <div
      ref={scrollRef}
      onScroll={loopCorrect}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="no-scrollbar mask-fade-x cursor-grab touch-pan-x overflow-x-auto overscroll-x-contain py-4 select-none active:cursor-grabbing"
    >
      <div className="flex w-max">
        {Array.from({ length: COPIES }).map((_, copy) => (
          <ul
            key={copy}
            ref={copy === 0 ? groupRef : undefined}
            aria-hidden={copy !== 0}
            className="flex shrink-0 gap-4 pr-4 sm:gap-6 sm:pr-6"
          >
            {images.map((image, i) => (
              <li
                key={i}
                className="bg-muted relative aspect-video w-80 shrink-0 overflow-hidden rounded-xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)] transition duration-500 ease-out hover:z-10 hover:scale-105 hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)] sm:w-[30rem]"
              >
                <Image
                  src={image.src}
                  alt={copy === 0 ? image.alt : ""}
                  fill
                  draggable={false}
                  sizes="(min-width: 640px) 480px, 320px"
                  className="pointer-events-none object-cover"
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
