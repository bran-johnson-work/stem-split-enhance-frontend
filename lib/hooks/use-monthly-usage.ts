"use client";

// Audio files uploaded in the current calendar month, counted client-side from
// the project list. The metered unit is files, not projects — a project can hold
// several input files, so we sum each this-month project's `inputFiles`.
//
// DEFERRED: the API has no usage endpoint, but it definitely counts — requesting
// a file upload URL 400s with *"Monthly upload limit reached (N audio files)"*.
// When a `GET /users/me/usage` lands, swap the body of this hook for it and every
// caller keeps working. Until then this is an approximation: it only sees the
// first USAGE_WINDOW projects, and a file created and then deleted still counts
// against the month on the backend but not here.

import { useProjects } from "@/lib/hooks/queries";

/** How far back we look. Comfortably past any plan's monthly cap. */
const USAGE_WINDOW = 100;

export interface MonthlyUsage {
  /** Audio files uploaded since the 1st of this month. */
  used: number;
  isLoading: boolean;
}

export function useMonthlyUsage(): MonthlyUsage {
  const { data, isLoading } = useProjects({ page: 1, pageSize: USAGE_WINDOW });

  const now = new Date();
  const used = (data?.items ?? []).reduce((sum, p) => {
    const created = new Date(p.createdAt);
    const thisMonth =
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear();
    // Count the project's uploaded input files; an empty (just-created) project
    // contributes 0 — files are what the plan meters.
    return thisMonth ? sum + (p.inputFiles?.length ?? 0) : sum;
  }, 0);

  return { used, isLoading };
}
