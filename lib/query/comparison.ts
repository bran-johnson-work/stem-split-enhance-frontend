"use client";

// The v1-vs-v2 engine comparison read.
//
// Polls while any version is still rendering, because that is the normal state on
// arrival: v2 costs roughly twice v1's wall-clock, so a user who opens a finished
// project during the staged rollout routinely finds v1 done and v2 mid-render. The
// screen offers the finished side immediately and fills the other in when it lands.

import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { USE_REAL_BACKEND } from "@/lib/config";
import { queryKeys } from "@/lib/query/keys";
import type { StemComparison } from "@/lib/types";

/**
 * Poll cadence while a version is still rendering. Slower than the project's own
 * 4 s status poll: this response carries a signed URL per stem for both versions,
 * so it is a much heavier payload for the same "are we there yet" question.
 */
const COMPARISON_POLL_MS = 10_000;

function isSettled(comparison: StemComparison | null | undefined): boolean {
  if (!comparison) return true;
  return comparison.versions.every((v) => v.state !== "processing");
}

export const comparisonQueries = {
  forProject: (projectId: string) =>
    queryOptions({
      queryKey: queryKeys.projects.stemComparison(projectId),
      queryFn: () => api.getStemsComparison(projectId),
      enabled: Boolean(projectId),
      refetchInterval: (query) => {
        // The mock resolves both versions as completed, so an interval there would
        // poll a static answer forever.
        if (!USE_REAL_BACKEND) return false;
        if (query.state.status !== "success") return false;
        return isSettled(query.state.data) ? false : COMPARISON_POLL_MS;
      },
    }),
};

export function useStemComparison(projectId: string) {
  return useQuery(comparisonQueries.forProject(projectId));
}
