"use client";

// User/account feature: the `userQueries` option factories (reusable across
// useQuery, prefetch and setQueryData) plus the account hooks. getCurrentUser is
// the single source of truth for "who am I"; the mutations run through the api
// seam and keep that cache honest — profile edits seed it directly (no refetch
// flicker in the sidebar), the rest just surface success/error to their forms.

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query/keys";
import type {
  ChangePasswordInput,
  UpdateProfileInput,
} from "@/lib/types";

export const userQueries = {
  /**
   * The signed-in user. Sourced from /users/me (mapped to `User`) with a backend
   * configured, or the mock user otherwise — see lib/api/auth.getCurrentUser.
   */
  current: () =>
    queryOptions({
      queryKey: queryKeys.users.current(),
      queryFn: () => getCurrentUser(),
    }),
};

export function useCurrentUser() {
  return useQuery(userQueries.current());
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.updateProfile(input),
    // Seed the cache with the updated user so the sidebar user menu picks up a
    // new name/avatar immediately, without a refetch.
    onSuccess: (user) =>
      queryClient.setQueryData(queryKeys.users.current(), user),
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
