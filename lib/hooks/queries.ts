"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/api/auth";
import { USE_REAL_BACKEND } from "@/lib/config";
import { isTerminal } from "@/lib/processing/pipeline";
import type {
  CardToken,
  ChangePasswordInput,
  ChangePlanInput,
  ProjectStatus,
  Subscription,
  UpdateProfileInput,
} from "@/lib/types";

/** Poll cadence for a live (non-terminal) project's status. */
const PROJECT_POLL_MS = 4000;

export interface ProjectsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProjectStatus[];
}

export const queryKeys = {
  currentUser: ["current-user"] as const,
  projects: (params?: ProjectsQuery) => ["projects", params ?? {}] as const,
  project: (id: string) => ["project", id] as const,
  plans: ["plans"] as const,
  subscription: ["subscription"] as const,
  invoices: ["invoices"] as const,
  paymentMethod: ["payment-method"] as const,
  adminUsers: ["admin", "users"] as const,
  adminProjects: ["admin", "projects"] as const,
};

export function useCurrentUser() {
  // Sourced from the real /users/me endpoint (mapped to `User`) when a backend
  // is configured, or the mock user otherwise — see lib/api/auth.getCurrentUser.
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => getCurrentUser(),
  });
}

/**
 * Account mutations. Each runs through the API seam, so they hit the real
 * PATCH/DELETE /users/{id} when a backend is configured and are simulated
 * otherwise. Toasts stay with the forms — these just keep the cache honest.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.updateProfile(input),
    // Seed the cache with the updated user so the sidebar user menu picks up a
    // new name/avatar immediately, without a refetch.
    onSuccess: (user) => queryClient.setQueryData(queryKeys.currentUser, user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.changePassword(input),
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: () => api.deleteAccount() });
}

export function useProjects(params?: ProjectsQuery) {
  return useQuery({
    queryKey: queryKeys.projects(params),
    queryFn: () => api.listProjects(params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => api.getProject(id),
    enabled: Boolean(id),
    // Real backend: poll for status until the project reaches a terminal state.
    // Mock: no polling — the local simulator (useProcessingStatus) drives the UI.
    refetchInterval: (query) => {
      if (!USE_REAL_BACKEND) return false;
      const data = query.state.data;
      return data && isTerminal(data.status) ? false : PROJECT_POLL_MS;
    },
  });
}

// Project creation now happens inside the upload flow (create → sign → PUT →
// complete); the finalised project is inserted into these caches by
// lib/hooks/use-upload-batch, so there's no standalone createProject mutation.

export function usePlans() {
  return useQuery({ queryKey: queryKeys.plans, queryFn: () => api.getPlans() });
}

export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => api.getSubscription(),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: () => api.listInvoices(),
  });
}

export function usePaymentMethod() {
  return useQuery({
    queryKey: queryKeys.paymentMethod,
    queryFn: () => api.getPaymentMethod(),
  });
}

/**
 * Billing mutations (KN-46). Every one of them lands the fresh subscription in
 * the cache and then invalidates the current user, because `User` *embeds* its
 * subscription — without that the sidebar and user menu keep showing the old
 * plan. Upgrades also bill immediately, so invoices are refetched too.
 */
function useSubscriptionMutation<TInput = void>(
  mutationFn: (input: TInput) => Promise<Subscription>,
) {
  const queryClient = useQueryClient();
  return useMutation<Subscription, Error, TInput>({
    mutationFn,
    onSuccess: (subscription) => {
      queryClient.setQueryData(queryKeys.subscription, subscription);
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
    },
  });
}

export function useChangePlan() {
  return useSubscriptionMutation((input: ChangePlanInput) =>
    api.changePlan(input),
  );
}

export function useCancelSubscription() {
  return useSubscriptionMutation<void>(() => api.cancelSubscription());
}

/** Undoes a scheduled cancellation *or* a scheduled downgrade. */
export function useResumeSubscription() {
  return useSubscriptionMutation<void>(() => api.resumeSubscription());
}

export function useSavePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: CardToken) => api.attachPaymentMethod(token),
    onSuccess: (method) =>
      queryClient.setQueryData(queryKeys.paymentMethod, method),
  });
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.removePaymentMethod(),
    onSuccess: () => queryClient.setQueryData(queryKeys.paymentMethod, null),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => api.adminListUsers(),
  });
}

export function useAdminProjects() {
  return useQuery({
    queryKey: queryKeys.adminProjects,
    queryFn: () => api.adminListProjects(),
  });
}
