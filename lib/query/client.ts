// The single place the app's QueryClient is built and handed out. Two enterprise
// concerns live here:
//
//   1. App-Router-safe instancing. On the server a fresh client is made per
//      request (a shared one would leak one user's cache into another's SSR);
//      in the browser a lazy singleton is reused across renders so the cache
//      survives navigation. This is the pattern the TanStack + Next docs bless.
//   2. One set of defaults + one error seam for the whole app: a sane
//      stale/gc/retry policy (no ret/toast storms on 4xx), and a QueryCache /
//      MutationCache `onError` that funnels every unexpected failure to a single
//      reporter (swap the console call for Sentry/Datadog without touching a
//      component).

import {
  MutationCache,
  QueryCache,
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";
// Side-effect import: applies the typed-error (Register) augmentation app-wide.
import "@/lib/query/register";

/** Status carried on errors thrown by lib/api/fetch (undefined for mock errors). */
function statusOf(error: unknown): number | undefined {
  return typeof error === "object" && error !== null && "status" in error
    ? (error as { status?: number }).status
    : undefined;
}

/**
 * Central failure reporter. Today it just logs; this is the seam where an
 * enterprise app wires Sentry/Datadog/structured logging so error reporting is
 * configured once instead of per call site.
 */
function reportError(scope: "query" | "mutation", error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[react-query:${scope}]`, error);
  }
}

/** Don't hammer the backend on client errors — only transient (5xx/network) ones. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = statusOf(error);
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for a minute, kept for five after going unused.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
      dehydrate: {
        // Include still-pending queries so server-prefetched data can stream in
        // and hydrate on the client (needed for prefetch-without-await flows).
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
    queryCache: new QueryCache({
      onError: (error) => reportError("query", error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => reportError("mutation", error),
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * The client to use everywhere. Server → new per call (per request); browser →
 * a lazily-created singleton. Use this in providers and in any server-side
 * prefetch (see lib/query/hydration).
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
