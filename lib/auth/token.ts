// The access token lives in a JS-readable cookie so two readers can reach it:
//   • the browser (apiFetch attaches it as `Authorization: Bearer <token>`), and
//   • Next middleware (reads it server-side to guard the (app) routes).
// It is deliberately NOT httpOnly — apiFetch needs to read it in the browser.
// This is the single source of truth for that cookie's name and mechanics.

export const TOKEN_COOKIE = "kn_token";

// The refresh token lives in its own cookie, and it is the thing that actually
// keeps a user signed in: the access token above expires in ~30 minutes, and
// the client silently trades this one for a new access token instead of
// bouncing the user to the login form. The proxy reads it too — an expired
// access token with a live refresh token is still a session.
export const REFRESH_TOKEN_COOKIE = "kn_refresh";

// Unlike the access token this one is *persistent*, so closing the browser no
// longer ends the session. Must stay <= the backend's REFRESH_TOKEN_EXPIRE_DAYS,
// or the cookie would outlive the row it points at.
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// The cookie is external mutable state; components read it via useSyncExternalStore
// (see auth-context). setToken/clearToken notify subscribers so that read re-runs.
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

// Session-length cookie (no Max-Age) — clears when the browser closes, which is
// a reasonable default for a bearer token that the server can also revoke.
// `SameSite=Lax` allows top-level navigations; `Secure` is added on https.
function cookieAttrs(): string {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  return `; Path=/; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Read the current token, or null if none / not in the browser. */
export function getToken(): string | null {
  return readCookie(TOKEN_COOKIE);
}

export function getRefreshToken(): string | null {
  return readCookie(REFRESH_TOKEN_COOKIE);
}

/**
 * Whether the user has a session at all.
 *
 * A refresh token alone counts: after a browser restart the (session-scoped)
 * access cookie is gone but the refresh cookie remains, and the first request
 * silently mints a new access token. Reading only the access token here would
 * flash a signed-out UI at every returning user.
 */
export function hasSession(): boolean {
  return Boolean(getToken() ?? getRefreshToken());
}

/**
 * Persist the refresh token. Every refresh returns a new one (the backend
 * rotates single-use tokens), so this is called on each silent refresh as well
 * as at login — dropping the replacement would end the session at the next one.
 */
export function setRefreshToken(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie =
    `${REFRESH_TOKEN_COOKIE}=${encodeURIComponent(token)}` +
    `${cookieAttrs()}; Max-Age=${REFRESH_MAX_AGE_SECONDS}`;
  notify();
}


/** Persist the token in the cookie (browser only). */
export function setToken(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}${cookieAttrs()}`;
  notify();
}

/** Remove both token cookies — ending the session, not just the access token. */
export function clearToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${cookieAttrs()}; Max-Age=0`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=${cookieAttrs()}; Max-Age=0`;
  notify();
}
