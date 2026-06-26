import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  priority = false,
}: {
  className?: string;
  href?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center", className)}
      aria-label="KlearNote home"
    >
      {/* Transparent horizontal KLEARNOTE.ai lockup (mark + wordmark).
          Logo-red ink on light surfaces, white ink in dark mode.
          Decorative — the link's aria-label carries the name. */}
      <Image
        src="/logo-horizontal-red.png"
        alt=""
        aria-hidden
        width={1779}
        height={278}
        priority={priority}
        className="h-8 w-auto dark:hidden"
      />
      <Image
        src="/logo-horizontal-white.png"
        alt=""
        aria-hidden
        width={1779}
        height={278}
        priority={priority}
        className="hidden h-8 w-auto dark:block"
      />
    </Link>
  );
}
