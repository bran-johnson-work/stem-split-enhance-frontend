// Status filter groups for the project history (KN-28). The UI thinks in a few
// coarse buckets ("Processing" spans the whole non-terminal pipeline), while the
// API filters on concrete `ProjectStatus[]`. This module is the single mapping
// between the two, plus the toolbar option list and page size.

import { isTerminal } from "@/lib/processing/pipeline";
import { PROCESSING_STATES, type ProjectStatus } from "@/lib/types";

/** Rows shown per page in the history table. */
export const HISTORY_PAGE_SIZE = 8;

export type StatusFilter = "all" | "processing" | "completed" | "failed";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const FILTER_VALUES = new Set<string>(STATUS_FILTERS.map((f) => f.value));

/** Narrow an arbitrary query-param string to a known filter (defaults to all). */
export function parseStatusFilter(value: string | null): StatusFilter {
  return value && FILTER_VALUES.has(value) ? (value as StatusFilter) : "all";
}

// The non-terminal pipeline states (queued + the four working stages). Derived
// from the pipeline so it can never drift from the stepper's definition.
const PROCESSING_STATUSES = PROCESSING_STATES.filter((s) => !isTerminal(s));

/**
 * Concrete statuses to send to `listProjects` for a given filter — `undefined`
 * for "all" (no restriction).
 */
export function statusesForFilter(
  filter: StatusFilter,
): ProjectStatus[] | undefined {
  switch (filter) {
    case "processing":
      return PROCESSING_STATUSES;
    case "completed":
      return ["completed"];
    case "failed":
      return ["failed"];
    default:
      return undefined;
  }
}
