"use client";

// Backwards-compatible facade for the data-fetching hooks. The implementations
// now live in feature modules under lib/query/* (each pairing its queryOptions
// factory with its hooks), organised the enterprise way; this module re-exports
// them under the names components have always imported, so every call site keeps
// working with a single stable import path. Prefer importing the option
// factories (projectQueries, userQueries, …) directly for prefetch/SSR.

export { useCurrentUser, useUpdateProfile, useChangePassword, useDeleteAccount } from "@/lib/query/users";
export { useProjects, useProject, type ProjectsQuery } from "@/lib/query/projects";
export {
  usePlans,
  useSubscription,
  useInvoices,
  usePaymentMethod,
  useChangePlan,
  useCancelSubscription,
  useResumeSubscription,
  useSavePaymentMethod,
  useRemovePaymentMethod,
} from "@/lib/query/billing";
export { useAdminUsers, useAdminProjects } from "@/lib/query/admin";

// The query key factory moved to lib/query/keys; re-exported here so existing
// `import { queryKeys } from "@/lib/hooks/queries"` call sites keep resolving.
export { queryKeys } from "@/lib/query/keys";
