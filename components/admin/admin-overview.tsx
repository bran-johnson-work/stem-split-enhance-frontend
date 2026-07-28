"use client";

// The admin overview dashboard: KPIs, revenue, and growth trends. Each section
// owns its own loading/error state (branching isError before any empty view, per
// the architecture rules) so one failing query never blanks the whole page.

import * as React from "react";
import { AdminKpiCards } from "@/components/admin/admin-kpi-cards";
import { AdminRevenueCards } from "@/components/admin/admin-revenue-cards";
import {
  AdminTrendsChart,
  DEFAULT_TREND_DAYS,
} from "@/components/admin/admin-trends-chart";
import {
  useAdminOverview,
  useAdminRevenue,
  useAdminTrends,
} from "@/lib/hooks/queries";

export function AdminOverview() {
  const overview = useAdminOverview();
  const revenue = useAdminRevenue();

  // The growth window is admin-selectable. Each value keys its own query (see
  // queryKeys.admin.trends), so switching ranges caches independently instead of
  // refetching the same window twice.
  const [trendDays, setTrendDays] = React.useState(DEFAULT_TREND_DAYS);
  const trends = useAdminTrends(trendDays);

  return (
    <div className="space-y-6">
      <AdminKpiCards
        overview={overview.data}
        isLoading={overview.isPending}
        isError={overview.isError}
      />
      <AdminRevenueCards
        revenue={revenue.data}
        isLoading={revenue.isPending}
        isError={revenue.isError}
      />
      <AdminTrendsChart
        points={trends.data}
        isLoading={trends.isPending}
        isError={trends.isError}
        days={trendDays}
        onDaysChange={setTrendDays}
      />
    </div>
  );
}
