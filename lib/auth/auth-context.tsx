"use client";

// Client-side auth surface. Holds the reactive "am I logged in?" flag and the
// login/register/logout actions. The calls themselves are react-query mutations
// in lib/query/auth, which own the token cookie and cache invalidation — this
// file is the context wrapper, not the transport. Route protection lives in
// proxy.ts (server-side); this is for client components that need to act on or
// react to auth state.

import * as React from "react";
import { hasSession, subscribeToken } from "@/lib/auth/token";
import { USE_REAL_BACKEND } from "@/lib/config";
import { useLogin, useLogout, useRegister } from "@/lib/query/auth";
import type { LoginValues, SignupValues } from "@/lib/validations/auth";

interface RegisterResult {
  /** True when the account must confirm its email before it can log in. */
  needsVerification: boolean;
}

interface AuthContextValue {
  /** Whether a token cookie is present (hydrated after mount). */
  isAuthenticated: boolean;
  login: (values: LoginValues) => Promise<void>;
  register: (values: SignupValues) => Promise<RegisterResult>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // The API calls themselves are react-query mutations (lib/query/auth), which
  // own the token cookie and cache invalidation. This provider is only the thin
  // context that exposes them as awaitable actions plus the reactive
  // "am I logged in?" flag — the forms' interface is unchanged.
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  // The token cookies are external state — read them through useSyncExternalStore
  // so login/logout (which call setToken/clearToken → notify) re-render
  // subscribers, and the server snapshot is false (no cookie) to avoid a
  // hydration mismatch.
  const isAuthenticated = React.useSyncExternalStore(
    subscribeToken,
    hasSession,
    () => false,
  );

  // `mutateAsync` (not `mutate`) because callers await these and surface the
  // rejection in their own form error state.
  const { mutateAsync: runLogin } = loginMutation;
  const { mutateAsync: runRegister } = registerMutation;
  const { mutateAsync: runLogout } = logoutMutation;

  const login = React.useCallback(
    async (values: LoginValues) => {
      await runLogin(values);
    },
    [runLogin],
  );

  const register = React.useCallback(
    async (values: SignupValues): Promise<RegisterResult> => {
      await runRegister(values);
      // Real backend: the account is unverified and cannot log in yet.
      if (USE_REAL_BACKEND) return { needsVerification: true };
      // Mock: no email step — log straight in for a smooth local demo.
      await runLogin({
        email: values.email,
        password: values.password,
        remember: false,
      });
      return { needsVerification: false };
    },
    [runRegister, runLogin],
  );

  const logout = React.useCallback(async () => {
    await runLogout();
  }, [runLogout]);

  const value = React.useMemo(
    () => ({ isAuthenticated, login, register, logout }),
    [isAuthenticated, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
