import type { ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Literal class strings so Tailwind v4 detects them (one per state color).
const config: Record<ProjectStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-queued/15 text-queued" },
  analyzing: { label: "Analyzing", className: "bg-analyzing/15 text-analyzing" },
  separating: { label: "Separating", className: "bg-separating/15 text-separating" },
  cleaning: { label: "Cleaning", className: "bg-cleaning/15 text-cleaning" },
  mastering: { label: "Mastering", className: "bg-mastering/15 text-mastering" },
  completed: { label: "Completed", className: "bg-completed/15 text-completed" },
  failed: { label: "Failed", className: "bg-failed/15 text-failed" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        c.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}
