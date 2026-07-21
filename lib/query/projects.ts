"use client";

// Projects feature: option factories + read hooks. The detail query uses a
// dynamic refetchInterval to poll a live project's status until it reaches a
// terminal state — but only against a real backend; in mock mode the local
// simulator (lib/hooks/use-processing-status) drives that UI instead, so
// polling stays off. Project *creation* happens in the upload flow, which slots
// the finished project straight into these caches (lib/hooks/use-upload-batch).

import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { USE_REAL_BACKEND } from "@/lib/config";
import { queryKeys } from "@/lib/query/keys";
import { isTerminal } from "@/lib/processing/pipeline";
import type { ProjectStatus } from "@/lib/types";

/** Poll cadence for a live (non-terminal) project's status. */
const PROJECT_POLL_MS = 4000;

export interface ProjectsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProjectStatus[];
}

export const projectQueries = {
  list: (params?: ProjectsQuery) =>
    queryOptions({
      queryKey: queryKeys.projects.list(params),
      queryFn: () => api.listProjects(params),
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.projects.detail(id),
      queryFn: () => api.getProject(id),
      enabled: Boolean(id),
      refetchInterval: (query) => {
        if (!USE_REAL_BACKEND) return false;
        const data = query.state.data;
        return data && isTerminal(data.status) ? false : PROJECT_POLL_MS;
      },
    }),
};

export function useProjects(params?: ProjectsQuery) {
  return useQuery(projectQueries.list(params));
}

export function useProject(id: string) {
  return useQuery(projectQueries.detail(id));
}
