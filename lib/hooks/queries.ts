"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/api/auth";
import { USE_REAL_BACKEND } from "@/lib/config";
import { isTerminal } from "@/lib/processing/pipeline";
import type { ProjectStatus } from "@/lib/types";

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
