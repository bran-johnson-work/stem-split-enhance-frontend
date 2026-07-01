"use client";

import { Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePlans } from "@/lib/hooks/queries";
import type { PlanId } from "@/lib/types";
import { cn } from "@/lib/utils";

type Cell = boolean | string;

type ComparisonRow = {
  label: string;
  values: Record<PlanId, Cell>;
};

// Static capability matrix. Column headers come from the live plans so names
// stay in sync; the per-plan cell values live here (frontend-only, no backend).
const rows: ComparisonRow[] = [
  {
    label: "Uploads per month",
    values: { free: "3", creator: "50", pro: "Unlimited", studio: "Unlimited" },
  },
  {
    label: "Stem quality",
    values: {
      free: "Standard",
      creator: "HQ",
      pro: "Lossless",
      studio: "Lossless",
    },
  },
  {
    label: "Download formats",
    values: {
      free: "MP3",
      creator: "WAV + MP3",
      pro: "WAV + MP3",
      studio: "WAV + MP3",
    },
  },
  {
    label: "Enhanced mastering",
    values: { free: false, creator: true, pro: "Advanced", studio: "Advanced" },
  },
  {
    label: "Priority processing",
    values: { free: false, creator: false, pro: true, studio: true },
  },
  {
    label: "Team seats",
    values: { free: false, creator: false, pro: false, studio: true },
  },
  {
    label: "API access",
    values: { free: false, creator: false, pro: false, studio: true },
  },
  {
    label: "Support",
    values: {
      free: "Community",
      creator: "Email",
      pro: "Priority",
      studio: "Dedicated",
    },
  },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true)
    return <Check className="text-brand mx-auto size-4" aria-label="Included" />;
  if (value === false)
    return (
      <Minus
        className="text-muted-foreground/50 mx-auto size-4"
        aria-label="Not included"
      />
    );
  return <span className="text-sm">{value}</span>;
}

export function PricingComparison() {
  const { data: plans, isLoading } = usePlans();

  if (isLoading || !plans) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="border-border/60 overflow-hidden rounded-xl border">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-muted/30 w-[34%] text-sm font-semibold">
              Compare plans
            </TableHead>
            {plans.map((plan) => (
              <TableHead
                key={plan.id}
                className={cn(
                  "text-center text-sm font-semibold",
                  plan.highlighted && "bg-brand-tint text-brand",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {plan.name}
                  {plan.highlighted && (
                    <Badge className="bg-brand px-1.5 py-0 text-[10px]">
                      Popular
                    </Badge>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="bg-muted/30 font-medium">
                {row.label}
              </TableCell>
              {plans.map((plan) => (
                <TableCell
                  key={plan.id}
                  className={cn(
                    "text-center",
                    plan.highlighted && "bg-brand-tint/40",
                  )}
                >
                  <CellValue value={row.values[plan.id]} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
