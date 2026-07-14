"use client";

import { Infinity as InfinityIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyUsage } from "@/lib/hooks/use-monthly-usage";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Uploads used against the plan's monthly allowance. Day 4 *shows* the number;
 * KN-47 (Day 5) is what gates the upload CTA on it.
 */
export function UsageMeter({ plan }: { plan: Plan }) {
  const { used, isLoading } = useMonthlyUsage();

  if (plan.uploadsPerMonth === "unlimited") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <InfinityIcon className="size-4" aria-hidden />
        Unlimited uploads this month
      </div>
    );
  }

  const limit = plan.uploadsPerMonth;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const atLimit = used >= limit;
  const nearLimit = !atLimit && pct >= 80;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Uploads this month</span>
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span
            className={cn(
              "font-medium tabular-nums",
              atLimit && "text-failed",
              nearLimit && "text-mastering",
            )}
          >
            {used} of {limit}
          </span>
        )}
      </div>
      <Progress
        value={isLoading ? 0 : pct}
        aria-label={`${used} of ${limit} uploads used this month`}
      />
      {atLimit && (
        <p className="text-failed text-xs">
          You&apos;ve used every upload on this plan. Upgrade to keep going.
        </p>
      )}
    </div>
  );
}
