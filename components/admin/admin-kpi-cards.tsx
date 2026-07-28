"use client";

import {
  CreditCard,
  FolderClock,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminOverview } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClassName: string;
}

// A status → accent-colour map. Completed/failed reuse the pipeline state tokens;
// everything else stays neutral. Class strings are literal so Tailwind v4 keeps
// them (a computed `text-${x}` would be purged).
function statusColor(status: string): string {
  if (status === "completed") return "text-completed";
  if (status === "failed") return "text-failed";
  return "text-muted-foreground";
}

export function AdminKpiCards({
  overview,
  isLoading,
  isError,
}: {
  overview?: AdminOverview;
  isLoading: boolean;
  isError: boolean;
}) {
  const kpis: Kpi[] = [
    {
      label: "Total users",
      value: overview?.users.total ?? 0,
      icon: Users,
      iconClassName: "bg-muted text-muted-foreground",
    },
    {
      label: "Active users",
      value: overview?.users.active ?? 0,
      icon: UserCheck,
      iconClassName: "bg-completed/15 text-completed",
    },
    {
      label: "Total projects",
      value: overview?.projects.total ?? 0,
      icon: FolderClock,
      iconClassName: "bg-separating/15 text-separating",
    },
    {
      label: "Active subscriptions",
      value: overview?.subscriptions.active ?? 0,
      icon: CreditCard,
      iconClassName: "bg-brand-tint text-brand",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {k.label}
              </CardTitle>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  k.iconClassName,
                )}
              >
                <k.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <span className="text-3xl font-semibold tabular-nums">
                  {/* An unknown count reads as "—"; a hard 0 would claim there's
                      nothing when we simply couldn't ask. */}
                  {isError ? "—" : k.value.toLocaleString()}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects-by-status is the customer-facing lifecycle. The internal
          "Jobs by status" breakdown was removed from the overview: it duplicated
          these same states (pending/processing/completed/failed) and read as a
          repeat rather than new signal. */}
      <StatusBreakdown
        title="Projects by status"
        byStatus={overview?.projects.byStatus}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
}

function StatusBreakdown({
  title,
  byStatus,
  isLoading,
  isError,
}: {
  title: string;
  byStatus?: Record<string, number>;
  isLoading: boolean;
  isError: boolean;
}) {
  const entries = Object.entries(byStatus ?? {});
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-muted-foreground text-sm">—</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {entries.map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between gap-2"
              >
                <dt className="text-muted-foreground truncate text-sm capitalize">
                  {status.replace(/_/g, " ")}
                </dt>
                <dd
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    statusColor(status),
                  )}
                >
                  {count.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
