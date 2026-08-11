"use client";

// Reads for the audio restoration pipeline.
//
// Only the ambient reads live here. A *run* is not a query — it is a chained
// sequence of two long jobs with its own abort and polling discipline, owned by
// lib/restoration/use-restoration-run.ts. Modelling that as a react-query
// mutation would hide the ordering constraint that makes the chain correct.

import { queryOptions, useQuery } from "@tanstack/react-query";
import * as restorationApi from "@/lib/api/restoration";
import { USE_REAL_BACKEND } from "@/lib/config";
import { queryKeys } from "@/lib/query/keys";

/** How often to re-check availability. A GPU host coming back should be noticed
 *  without a reload, but it is ambient state — nothing waits on it. */
const SERVICE_POLL_MS = 60_000;

export const restorationQueries = {
  service: () =>
    queryOptions({
      queryKey: queryKeys.restoration.service(),
      queryFn: () => restorationApi.getServiceStatus(),
      // No mock path: an unconfigured backend genuinely has no restoration
      // service, and reporting a fake healthy one would hide that.
      enabled: USE_REAL_BACKEND,
      staleTime: 30_000,
      refetchInterval: SERVICE_POLL_MS,
      // The endpoint answers with a body rather than an error when the upstream
      // is down, so a rejection here is our own API failing — worth one retry.
      retry: 1,
    }),

  forProject: (projectId: string) =>
    queryOptions({
      queryKey: queryKeys.restoration.list(projectId),
      queryFn: () => restorationApi.listRestorationJobs(projectId),
      enabled: USE_REAL_BACKEND && Boolean(projectId),
    }),
};

/** Whether restoration is available, and on what hardware. */
export function useRestorationService() {
  return useQuery(restorationQueries.service());
}

/** Every restoration run recorded against one project. */
export function useProjectRestorations(projectId: string) {
  return useQuery(restorationQueries.forProject(projectId));
}
