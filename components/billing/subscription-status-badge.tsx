import type { SubscriptionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Reuses the pipeline state colors (app/globals.css) so a subscription reads with
// the same visual grammar as a project status — see components/projects/status-badge.
// Literal class strings so Tailwind v4 detects them.
const config: Record<SubscriptionStatus, { label: string; className: string }> = {
  trialing: { label: "Trial", className: "bg-analyzing/15 text-analyzing" },
  active: { label: "Active", className: "bg-completed/15 text-completed" },
  past_due: { label: "Past due", className: "bg-failed/15 text-failed" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground" },
};

export function SubscriptionStatusBadge({
  status,
  className,
}: {
  status: SubscriptionStatus;
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
