// Real auth calls against Dakota's API, with a mock fallback so the app stays
// usable when no backend is configured (USE_REAL_BACKEND === false). This is the
// module that replaces lib/auth/mock-auth.ts for login/register/verify; the
// forget/reset-password mocks stay there until a backend exists for them.
//
// Every function branches on USE_REAL_BACKEND so callers (and the AuthProvider)
// never need to know which mode they're in.

import { apiFetch } from "@/lib/api/fetch";
import { getRefreshToken } from "@/lib/auth/token";
import { readStoredAvatar } from "@/lib/avatar/avatar-store";
import { USE_REAL_BACKEND, apiUrl } from "@/lib/config";
import { CURRENT_USER } from "@/lib/mock/fixtures";
import type { User, UserRole } from "@/lib/types";
import type { LoginValues, SignupValues } from "@/lib/validations/auth";

/** Shape of the API's UserResponse (see docs/API doc.yaml). */
export interface UserResponse {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_verified: boolean;
  /** Server-assigned, from the `users.role` column. Never client-derived. */
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  /** Opaque, rotating. Absent in mock mode. */
  refresh_token?: string;
}

/** A synthetic token used in mock mode so the cookie/middleware flow still works. */
export const MOCK_TOKEN = "mock-session";

/**
 * The sole password accepted in mock mode (no backend). Paired with the seeded
 * user's email (`CURRENT_USER.email`), it's the one dev credential the app
 * recognises, so the mock session maps to a real identity instead of letting
 * any email through. Not a secret — there is no backend and it resets on reload.
 */
export const DEV_PASSWORD = "123!@#qweQWE";

const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

/**
 * Map the backend UserResponse onto the app's richer `User`.
 *
 * `role` is the backend's own column — the client must never decide who is an
 * admin. It gates admin navigation only; the API enforces authorisation itself,
 * so a tampered client buys nothing but a broken menu.
 *
 * `subscription` is still borrowed from the mock: the real billing surface is
 * Stripe Checkout/Portal-based and is fetched separately (lib/query/billing).
 */
export function mapUser(u: UserResponse): User {
  return {
    id: u.id,
    name: u.full_name?.trim() || u.email.split("@")[0],
    email: u.email,
    role: u.role,
    createdAt: u.created_at,
    subscription: CURRENT_USER.subscription,
  };
}

/** The credentials a successful login hands back. */
export interface Session {
  accessToken: string;
  /** Absent in mock mode, which has no refresh flow to simulate. */
  refreshToken?: string;
}

/** Log in and return the session tokens. Throws an Error (with `.status`) on failure. */
export async function login(values: LoginValues): Promise<Session> {
  if (!USE_REAL_BACKEND) {
    await delay();
    const ok =
      values.email.trim().toLowerCase() === CURRENT_USER.email.toLowerCase() &&
      values.password === DEV_PASSWORD;
    if (!ok) throw new Error("Invalid email or password.");
    return { accessToken: MOCK_TOKEN };
  }
  // OAuth2 password grant — form-encoded, `username` is the email.
  const res = await apiFetch<TokenResponse>(apiUrl("/auth/login"), {
    method: "POST",
    anonymous: true,
    form: { username: values.email, password: values.password },
  });
  return { accessToken: res.access_token, refreshToken: res.refresh_token };
}

/** Register a new account. In real mode the account starts unverified. */
export async function register(values: SignupValues): Promise<void> {
  if (!USE_REAL_BACKEND) {
    await delay();
    if (values.email.toLowerCase() === "taken@klearnote.ai") {
      throw new Error("That email is already registered.");
    }
    return;
  }
  await apiFetch<UserResponse>(apiUrl("/auth/register"), {
    method: "POST",
    anonymous: true,
    json: {
      email: values.email,
      password: values.password,
      full_name: values.name,
    },
  });
}

/**
 * Revoke the session server-side (best-effort; the cookies are cleared
 * regardless). The refresh token is sent along deliberately — revoking only the
 * access token would leave the refresh token live, and anyone holding it could
 * mint a fresh session straight after "logging out".
 */
export async function logout(): Promise<void> {
  if (!USE_REAL_BACKEND) return;
  const refreshToken = getRefreshToken();
  await apiFetch<unknown>(apiUrl("/auth/logout"), {
    method: "POST",
    json: { refresh_token: refreshToken },
  }).catch(() => {});
}

/** (Re)send a verification email. Always resolves (the API is deliberately generic). */
export async function requestEmailVerification(email: string): Promise<void> {
  if (!USE_REAL_BACKEND) {
    await delay();
    return;
  }
  await apiFetch<unknown>(apiUrl("/auth/verify-email/request"), {
    method: "POST",
    anonymous: true,
    json: { email },
  });
}

/** Confirm an email with the token from the verification link. Throws on invalid/expired. */
export async function confirmEmailVerification(token: string): Promise<void> {
  if (!USE_REAL_BACKEND) {
    await delay();
    return;
  }
  await apiFetch<unknown>(apiUrl("/auth/verify-email/confirm"), {
    method: "POST",
    anonymous: true,
    json: { token },
  });
}

/**
 * DEFERRED: neither the API's UserResponse nor the mock fixture carries an
 * avatar, so the image the user picked (kept on the device by the AvatarStore
 * seam) is overlaid here — without this it would vanish on the next refetch.
 * Delete alongside `localAvatarStore` when the avatar endpoint lands.
 */
function withStoredAvatar(user: User): User {
  const stored = readStoredAvatar();
  return stored ? { ...user, avatarUrl: stored } : user;
}

/** The current authenticated user, mapped to the app's `User` shape. */
export async function getCurrentUser(): Promise<User> {
  if (!USE_REAL_BACKEND) {
    await delay(150);
    return withStoredAvatar(structuredClone(CURRENT_USER));
  }
  const res = await apiFetch<UserResponse>(apiUrl("/users/me"));
  return withStoredAvatar(mapUser(res));
}
