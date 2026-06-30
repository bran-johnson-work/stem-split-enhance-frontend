import { cn } from "@/lib/utils";

/**
 * Consistent section header used across the landing page:
 * a small brand eyebrow chip, a large title, and an optional subtitle.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow ? (
        <span className="bg-brand-tint text-brand inline-flex items-center rounded-full px-3 py-1 font-mono text-xs font-medium tracking-widest uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-muted-foreground max-w-xl text-base text-pretty sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
