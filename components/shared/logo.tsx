import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  priority = false,
  variant = "auto",
}: {
  className?: string;
  href?: string;
  priority?: boolean;
  /**
   * Which ink to render. "auto" (default) follows the theme — red on light,
   * white in dark mode. "white"/"red" force one ink regardless of theme,
   * e.g. "white" when the logo sits on a dark photo or gradient.
   */
  variant?: "auto" | "red" | "white";
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
      {variant !== "white" && (
        <Image
          src="/logo-horizontal-red.png"
          alt=""
          aria-hidden
          width={1779}
          height={278}
          priority={priority}
          className={cn("h-8 w-auto", variant === "auto" && "dark:hidden")}
        />
      )}
      {variant !== "red" && (
        <Image
          src="/logo-horizontal-white.png"
          alt=""
          aria-hidden
          width={1779}
          height={278}
          priority={priority}
          className={cn("h-8 w-auto", variant === "auto" && "hidden dark:block")}
        />
      )}
    </Link>
  );
}
