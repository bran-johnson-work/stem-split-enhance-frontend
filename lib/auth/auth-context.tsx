"use client";

// Client-side auth surface. Holds the reactive "am I logged in?" flag and the
// login/register/logout actions, keeping the token cookie and the react-query
// cache in sync. Route protection itself lives in middleware.ts (server-side);
// this is for client components that need to act on or react to auth state.

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/lib/api/auth";
import {
  clearToken,
  getToken,
  setToken,
  subscribeToken,
} from "@/lib/auth/token";
import { USE_REAL_BACKEND } from "@/lib/config";
import { queryKeys } from "@/lib/hooks/queries";
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
  const queryClient = useQueryClient();

  // The token cookie is external state — read it through useSyncExternalStore so
  // login/logout (which call setToken/clearToken → notify) re-render subscribers,
  // and the server snapshot is null (no cookie) to avoid a hydration mismatch.
  const token = React.useSyncExternalStore(
    subscribeToken,
    getToken,
    () => null,
  );
  const isAuthenticated = Boolean(token);

  const login = React.useCallback(
    async (values: LoginValues) => {
      const accessToken = await authApi.login(values);
      setToken(accessToken);
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
    [queryClient],
  );

  const register = React.useCallback(
    async (values: SignupValues): Promise<RegisterResult> => {
      await authApi.register(values);
      // Real backend: the account is unverified and cannot log in yet.
      if (USE_REAL_BACKEND) return { needsVerification: true };
      // Mock: no email step — log straight in for a smooth local demo.
      await login({
        email: values.email,
        password: values.password,
        remember: false,
      });
      return { needsVerification: false };
    },
    [login],
  );

  const logout = React.useCallback(async () => {
    await authApi.logout();
    clearToken();
    queryClient.clear();
  }, [queryClient]);

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
