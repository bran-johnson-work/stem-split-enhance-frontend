"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminTrendPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

// Series colours come from the shared --chart-* tokens so the chart tracks the
// brand and flips correctly in dark mode (the tokens are redefined there).
const SIGNUPS_COLOR = "var(--chart-1)";
const PROJECTS_COLOR = "var(--chart-3)";

// The selectable growth windows. Each is within the backend's 1–365 `days`
// bound; 30 is the default so the initial view matches the old fixed range.
const TREND_RANGES = [7, 30, 90] as const;
export const DEFAULT_TREND_DAYS = 30;

/** "2026-07-28" → "Jul 28". Parsed as UTC to avoid an off-by-one near midnight. */
function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Minimal shape of what recharts passes its tooltip `content` at runtime — typed
// locally because recharts v3's exported TooltipProps no longer carries these.
interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border p-2.5 text-xs shadow-md">
      <p className="mb-1 font-medium">{shortDate(String(label))}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium tabular-nums">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function TrendRangeSelect({
  days,
  onDaysChange,
}: {
  days: number;
  onDaysChange: (days: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Growth window"
      className="bg-muted inline-flex items-center gap-0.5 rounded-lg p-0.5"
    >
      {TREND_RANGES.map((range) => {
        const active = range === days;
        return (
          <button
            key={range}
            type="button"
            aria-pressed={active}
            onClick={() => onDaysChange(range)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {range}d
          </button>
        );
      })}
    </div>
  );
}

export function AdminTrendsChart({
  points,
  isLoading,
  isError,
  days,
  onDaysChange,
}: {
  points?: AdminTrendPoint[];
  isLoading: boolean;
  isError: boolean;
  days: number;
  onDaysChange: (days: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle>Growth · last {days} days</CardTitle>
        <TrendRangeSelect days={days} onDaysChange={onDaysChange} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : isError ? (
          <div className="text-muted-foreground flex h-72 items-center justify-center text-sm">
            Couldn&apos;t load activity trends.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SIGNUPS_COLOR} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SIGNUPS_COLOR} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillProjects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PROJECTS_COLOR} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PROJECTS_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeOpacity={0.6}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="projectsCreated"
                  name="Projects"
                  stroke={PROJECTS_COLOR}
                  fill="url(#fillProjects)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="signups"
                  name="Signups"
                  stroke={SIGNUPS_COLOR}
                  fill="url(#fillSignups)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
