"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Cycles through `words` on a fixed interval with a crossfade.
 * All words are stacked in a single grid cell so the box reserves the
 * widest word's width — the surrounding line never reflows.
 * Decorative: the consumer supplies a stable label for screen readers.
 */
export function RotatingWord({
  words,
  intervalMs = 4000,
  className,
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Respect reduced-motion: leave the word resting on the first item.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span className="inline-grid align-baseline">
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== index}
          className={cn(
            "col-start-1 row-start-1 whitespace-nowrap text-left transition-opacity duration-500",
            i === index ? "opacity-100" : "opacity-0",
            className,
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
