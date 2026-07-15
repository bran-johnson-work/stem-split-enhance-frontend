import type { Invoice } from "@/lib/types";
import { cn } from "@/lib/utils";

// Literal class strings so Tailwind v4 detects them.
const config: Record<Invoice["status"], { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-completed/15 text-completed" },
  open: { label: "Open", className: "bg-queued/15 text-queued" },
  failed: { label: "Failed", className: "bg-failed/15 text-failed" },
};

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: Invoice["status"];
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
