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
};

export function useAdminUsers() {
  return useQuery(adminQueries.users());
}

export function useAdminProjects() {
  return useQuery(adminQueries.projects());
}
