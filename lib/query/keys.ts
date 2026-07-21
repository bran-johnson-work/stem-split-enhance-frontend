// The single source of truth for every query key in the app. Keys are
// hierarchical so invalidation can be as broad or narrow as needed: invalidating
// `projects.lists()` refetches every list variant without disturbing any open
// detail view, while `projects.all` clears the whole feature. Never write a
// literal key (`["projects"]`) in a component or hook — always go through here,
// so a key can never drift between where it's written and where it's read.

import type { ProjectsQuery } from "@/lib/query/projects";

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    /** Keyed by token so each verification link resolves independently. */
    emailVerification: (token: string) =>
      [...queryKeys.auth.all, "email-verification", token] as const,
  },
  users: {
    all: ["users"] as const,
    current: () => [...queryKeys.users.all, "current"] as const,
  },
  projects: {
    all: ["projects"] as const,
    lists: () => [...queryKeys.projects.all, "list"] as const,
    list: (params?: ProjectsQuery) =>
      [...queryKeys.projects.lists(), params ?? {}] as const,
    details: () => [...queryKeys.projects.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },
  billing: {
    all: ["billing"] as const,
    plans: () => [...queryKeys.billing.all, "plans"] as const,
    subscription: () => [...queryKeys.billing.all, "subscription"] as const,
    invoices: () => [...queryKeys.billing.all, "invoices"] as const,
    paymentMethod: () => [...queryKeys.billing.all, "payment-method"] as const,
  },
  admin: {
    all: ["admin"] as const,
    users: () => [...queryKeys.admin.all, "users"] as const,
    projects: () => [...queryKeys.admin.all, "projects"] as const,
  },
} as const;
