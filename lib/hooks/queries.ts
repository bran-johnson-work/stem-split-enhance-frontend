"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateProjectInput, Paginated, Project } from "@/lib/types";

function titleFromFile(input: CreateProjectInput): string {
  return (
    input.title?.trim() ||
    input.sourceFileName.replace(/\.[^./\\]+$/, "") ||
    "Untitled track"
  );
}

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

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.createProject(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });
      const previous = queryClient.getQueriesData<Paginated<Project>>({
        queryKey: ["projects"],
      });
      const nowIso = new Date().toISOString();
      const optimistic: Project = {
        id: `temp_${Date.now()}`,
        title: titleFromFile(input),
        status: "queued",
        progress: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
        sourceFileName: input.sourceFileName,
        sourceSizeBytes: input.sourceSizeBytes,
        durationSec: input.durationSec ?? 0,
        stems: [],
      };
      queryClient.setQueriesData<Paginated<Project>>(
        { queryKey: ["projects"] },
        (old) =>
          old
            ? { ...old, items: [optimistic, ...old.items], total: old.total + 1 }
            : old,
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      context?.previous?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
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
