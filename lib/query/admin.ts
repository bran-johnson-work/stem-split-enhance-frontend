"use client";

// Admin feature: read-only list option factories + hooks. Both delegate to the
// mock inside HttpApi until real admin endpoints land, so there are no
// mutations here yet.

import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

export const adminQueries = {
  users: () =>
    queryOptions({
      queryKey: queryKeys.admin.users(),
      queryFn: () => api.adminListUsers(),
    }),
  projects: () =>
    queryOptions({
      queryKey: queryKeys.admin.projects(),
      queryFn: () => api.adminListProjects(),
    }),
  overview: () =>
    queryOptions({
      queryKey: queryKeys.admin.overview(),
      queryFn: () => api.adminOverview(),
    }),
  revenue: () =>
    queryOptions({
      queryKey: queryKeys.admin.revenue(),
      queryFn: () => api.adminRevenue(),
    }),
  trends: (days: number) =>
    queryOptions({
      queryKey: queryKeys.admin.trends(days),
      queryFn: () => api.adminTrends(days),
    }),
};

export function useAdminUsers() {
  return useQuery(adminQueries.users());
}

export function useAdminProjects() {
  return useQuery(adminQueries.projects());
}

export function useAdminOverview() {
  return useQuery(adminQueries.overview());
}

export function useAdminRevenue() {
  return useQuery(adminQueries.revenue());
}

export function useAdminTrends(days: number) {
  return useQuery(adminQueries.trends(days));
}
