"use client";

import Image from "next/image";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/**
 * Mobile-only nav button for the app top bar. Shows the KlearNote logo mark
 * (red on light, white in dark) and opens the slide-in sidebar drawer.
 * Replaces the generic panel/collapse icon, which reads as a desktop metaphor
 * and left the mobile bar without any brand presence.
 */
export function MobileNavTrigger({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Open menu"
      className={cn(
        "hover:bg-accent flex size-9 shrink-0 items-center justify-center rounded-md transition-colors md:hidden",
        className,
      )}
    >
      <Image
        src="/logo-mark-red.png"
        alt=""
        aria-hidden
        width={24}
        height={24}
        priority
        className="size-6 dark:hidden"
      />
      <Image
        src="/logo-mark-white.png"
        alt=""
        aria-hidden
        width={24}
        height={24}
        priority
        className="hidden size-6 dark:block"
      />
    </button>
  );
}
