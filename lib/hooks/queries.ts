"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const queryKeys = {
  currentUser: ["current-user"] as const,
  projects: (params?: { page?: number; search?: string }) =>
    ["projects", params ?? {}] as const,
  project: (id: string) => ["project", id] as const,
  plans: ["plans"] as const,
  subscription: ["subscription"] as const,
  invoices: ["invoices"] as const,
  adminUsers: ["admin", "users"] as const,
  adminProjects: ["admin", "projects"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => api.getCurrentUser(),
  });
}

export function useProjects(params?: { page?: number; search?: string }) {
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
  });
}

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
