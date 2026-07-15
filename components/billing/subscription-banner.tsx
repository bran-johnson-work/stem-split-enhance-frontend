"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CircleAlert,
  CreditCard,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AlertTone, SubscriptionAlert } from "@/lib/billing/entitlements";
import { useSubscriptionAlert } from "@/lib/hooks/use-subscription-alert";
import { cn } from "@/lib/utils";

// Reuses the pipeline state colors (app/globals.css) so billing reads with the
// same visual grammar as project status — see subscription-status-badge.
const toneBox: Record<AlertTone, string> = {
  info: "border-analyzing/40 bg-analyzing/8",
  warning: "border-mastering/40 bg-mastering/8",
  danger: "border-failed/40 bg-failed/8",
};

const toneIcon: Record<AlertTone, string> = {
  info: "text-analyzing",
  warning: "text-mastering",
  danger: "text-failed",
};

const kindIcon: Record<SubscriptionAlert["kind"], LucideIcon> = {
  trialing: Sparkles,
  ending: CalendarClock,
  past_due: CreditCard,
  canceled: CircleAlert,
};

/**
 * The app-wide subscription banner. Rendered once in the authed shell so
 * `trialing` / `past_due` / `canceled` (and a pending cancellation) follow the
 * user everywhere, not just on `/billing`. Renders nothing for a healthy plan.
 */
export function SubscriptionBanner() {
  const pathname = usePathname();
  const alert = useSubscriptionAlert();
  if (!alert) return null;

  // On /billing the current-plan card already shows a richer, actionable version
  // of every one of these states, so the strip would just be a duplicate.
  if (pathname?.startsWith("/billing")) return null;

  const Icon = kindIcon[alert.kind];

  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center",
        toneBox[alert.tone],
      )}
    >
      <Icon className={cn("size-5 shrink-0", toneIcon[alert.tone])} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium">{alert.title}</p>
        <p className="text-muted-foreground text-sm">{alert.body}</p>
      </div>
      <Button asChild size="sm" className="shrink-0 sm:ml-2">
        <Link href={alert.cta.href}>{alert.cta.label}</Link>
      </Button>
    </div>
  );
}
