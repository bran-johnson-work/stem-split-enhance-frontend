"use client";

import { DollarSign, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import type { AdminRevenue } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RevenueStat {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName: string;
}

export function AdminRevenueCards({
  revenue,
  isLoading,
  isError,
}: {
  revenue?: AdminRevenue;
  isLoading: boolean;
  isError: boolean;
}) {
  const stats: RevenueStat[] = [
    {
      label: "Monthly recurring revenue",
      value: formatCurrency(revenue?.mrr ?? 0),
      icon: DollarSign,
      iconClassName: "bg-brand-tint text-brand",
    },
    {
      label: "Annual run rate",
      value: formatCurrency(revenue?.arr ?? 0),
      icon: TrendingUp,
      iconClassName: "bg-completed/15 text-completed",
    },
    {
      label: "Paying subscribers",
      value: (revenue?.activePaidSubscriptions ?? 0).toLocaleString(),
      icon: Users,
      iconClassName: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {s.label}
              </CardTitle>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  s.iconClassName,
                )}
              >
                <s.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-28" />
              ) : (
                <span className="text-3xl font-semibold tabular-nums">
                  {isError ? "—" : s.value}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Revenue by plan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <p className="text-muted-foreground text-sm">
              Couldn&apos;t load revenue breakdown.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Active subs</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(revenue?.byPlan ?? []).map((plan) => (
                  <TableRow key={plan.planName}>
                    <TableCell className="font-medium capitalize">
                      {plan.displayName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {plan.activeSubscriptions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(plan.mrr)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
