"use client";

// Auth feature: every credential/verification call as a react-query hook, so
// auth is consistent with the rest of the app (users, projects, billing) rather
// than the one corner that hand-rolls its own loading and error state.
//
// The token cookie is deliberately written *inside* the mutation callbacks: the
// cookie and the "who am I" cache are one unit of state, and keeping them in
// sync here means no caller can set one and forget the other.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/lib/api/auth";
import { clearToken, setRefreshToken, setToken } from "@/lib/auth/token";
import { queryKeys } from "@/lib/query/keys";
import type { LoginValues, SignupValues } from "@/lib/validations/auth";

/** Log in, store the tokens, and refetch the current user under the new identity. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginValues) => authApi.login(values),
    onSuccess: ({ accessToken, refreshToken }) => {
      setToken(accessToken);
      // Absent in mock mode, which has no refresh endpoint to call.
      if (refreshToken) setRefreshToken(refreshToken);
      // Returned so the mutation stays pending until the user is loaded — the
      // caller can redirect knowing the sidebar won't flash an empty account.
      return queryClient.invalidateQueries({
        queryKey: queryKeys.users.current(),
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (values: SignupValues) => authApi.register(values),
  });
}

/**
 * Log out. The cleanup runs in `onSettled`, not `onSuccess`: revoking the token
 * server-side is best-effort, and a user who clicked "log out" must end up
 * logged out locally whether or not that call succeeded.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearToken();
      queryClient.clear();
    },
  });
}

/**
 * Confirm the token from a verification link.
 *
 * Modelled as a query rather than a mutation, deliberately: it fires on mount
 * from a URL parameter and the UI wants exactly the pending/success/error
 * triple a query already provides. `retry: false` matters — a rejected token is
 * a real answer, not a transient failure, so it must not be re-POSTed. Pass an
 * empty token to keep it idle.
 */
export function useConfirmEmailVerification(token: string) {
  return useQuery({
    queryKey: queryKeys.auth.emailVerification(token),
    queryFn: async () => {
      await authApi.confirmEmailVerification(token);
      return true as const;
    },
    enabled: Boolean(token),
    retry: false,
    // The result is a property of the token, so it never goes stale on its own.
    staleTime: Infinity,
    refetchOnMount: false,
  });
}

export function useResendEmailVerification() {
  return useMutation({
    mutationFn: (email: string) => authApi.requestEmailVerification(email),
  });
}
