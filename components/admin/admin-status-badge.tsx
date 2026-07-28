import type { AdminProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// The admin monitor shows the *raw* backend project status verbatim (no
// collapsing onto the app's finer client lifecycle), so this badge maps the six
// server states directly. Class strings are literal so Tailwind v4 keeps them.
const config: Record<AdminProjectStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  uploading: { label: "Uploading", className: "bg-queued/15 text-queued" },
  queued: { label: "Queued", className: "bg-queued/15 text-queued" },
  processing: { label: "Processing", className: "bg-separating/15 text-separating" },
  completed: { label: "Completed", className: "bg-completed/15 text-completed" },
  failed: { label: "Failed", className: "bg-failed/15 text-failed" },
};

export function AdminStatusBadge({
  status,
  className,
}: {
  status: AdminProjectStatus;
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
