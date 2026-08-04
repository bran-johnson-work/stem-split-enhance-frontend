
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
    /** v1-vs-v2 engine output for one project (the compare screen). */
    stemComparison: (id: string) =>
      [...queryKeys.projects.all, "stem-comparison", id] as const,
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
    overview: () => [...queryKeys.admin.all, "overview"] as const,
    revenue: () => [...queryKeys.admin.all, "revenue"] as const,
    // Keyed by window so a 7-day and 30-day view cache independently.
    trends: (days: number) => [...queryKeys.admin.all, "trends", days] as const,
  },
} as const;
