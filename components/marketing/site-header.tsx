"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { marketingNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Sticky marketing header that morphs on scroll. At the very top the
 * background bar spans the full viewport width with a flat bottom
 * border (matching the rest of the page). Once scrolled it contracts
 * to the layout width and lifts into a rounded, frosted-glass pill —
 * more transparency + blur, plus an elevation shadow "layer".
 *
 * The background and the content are separate layers so the nav items
 * stay aligned to the `max-w-6xl` content column in both states while
 * only the bar itself animates its width.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // sync on mount (e.g. restored scroll position)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* animated background: full-width strip -> centred glass pill */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 mx-auto h-16 transition-all duration-500 ease-out motion-reduce:transition-none",
          scrolled
            ? "top-3 max-w-6xl rounded-full border border-border/50 bg-background/40 shadow-lg shadow-black/[0.07] backdrop-blur-xl"
            : "max-w-full border-b border-transparent bg-transparent",
        )}
      />

      {/* content: always pinned to the layout column. Uses a transform
          (not margin) for the scrolled drop so the header's flow height
          stays a constant 64px and the page never reflows on scroll. */}
      <div
        className={cn(
          "relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 transition-transform duration-500 ease-out motion-reduce:transition-none sm:px-6",
          scrolled && "translate-y-3",
        )}
      >
        <Logo priority />

        <nav className="hidden items-center gap-1 md:flex">
          {marketingNav.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={item.href}>{item.title}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/signup">Get started</Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1 px-2">
                {marketingNav.map((item) => (
                  <Button key={item.href} variant="ghost" className="justify-start" asChild>
                    <Link href={item.href}>{item.title}</Link>
                  </Button>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/signup">Get started</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
