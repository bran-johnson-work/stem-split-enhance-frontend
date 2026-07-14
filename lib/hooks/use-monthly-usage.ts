"use client";

// Uploads consumed in the current calendar month, counted client-side from the
// project list.
//
// DEFERRED: the API has no usage endpoint, but it definitely counts — creating a
// project 400s with *"Monthly project limit reached (N)"* (see docs/API doc.yaml).
// When a `GET /users/me/usage` lands, swap the body of this hook for it and every
// caller keeps working. Until then this is an approximation: it only sees the
// first USAGE_WINDOW projects, and a project created and then deleted still
// counts against the month on the backend but not here.

import { useProjects } from "@/lib/hooks/queries";

/** How far back we look. Comfortably past any plan's monthly cap. */
const USAGE_WINDOW = 100;

export interface MonthlyUsage {
  /** Projects created since the 1st of this month. */
  used: number;
  isLoading: boolean;
}

export function useMonthlyUsage(): MonthlyUsage {
  const { data, isLoading } = useProjects({ page: 1, pageSize: USAGE_WINDOW });

  const now = new Date();
  const used = (data?.items ?? []).filter((p) => {
    const created = new Date(p.createdAt);
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;

  return { used, isLoading };
}
