// Server-side prefetch → client hydration helper for the App Router. A server
// component prefetches one or more queries and wraps its children in the boundary
// this returns; the matching client hook (useProjects, useCurrentUser, …) then
// mounts with data already in cache — no loading flash, no client waterfall.
//
// Usage (in a Server Component):
//   const { HydrateQuery } = await prefetchQueries([
//     projectQueries.list({ page: 1 }),
//     userQueries.current(),
//   ]);
//   return <HydrateQuery><ProjectsHistory /></HydrateQuery>;
//
// Because query option factories (projectQueries.*, userQueries.*, …) carry both
// the key and the fetcher, the same object drives prefetch here and useQuery in
// the component — they can never disagree on key or types.

import * as React from "react";
import {
  HydrationBoundary,
  dehydrate,
  type FetchQueryOptions,
} from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFetchOptions = FetchQueryOptions<any, any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function prefetchQueries(options: AnyFetchOptions[]) {
  const queryClient = getQueryClient();
  await Promise.all(options.map((o) => queryClient.prefetchQuery(o)));

  const state = dehydrate(queryClient);
  function HydrateQuery({ children }: { children: React.ReactNode }) {
    return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
  }
  return { HydrateQuery };
}
