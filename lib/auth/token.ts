// The access token lives in a JS-readable cookie so two readers can reach it:
//   • the browser (apiFetch attaches it as `Authorization: Bearer <token>`), and
//   • Next middleware (reads it server-side to guard the (app) routes).
// It is deliberately NOT httpOnly — apiFetch needs to read it in the browser.
// This is the single source of truth for that cookie's name and mechanics.

export const TOKEN_COOKIE = "kn_token";

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

/** Read the current token, or null if none / not in the browser. */
export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${TOKEN_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(TOKEN_COOKIE.length + 1)) : null;
}

/** Persist the token in the cookie (browser only). */
export function setToken(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}${cookieAttrs()}`;
  notify();
}

/** Remove the token cookie (browser only). */
export function clearToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${cookieAttrs()}; Max-Age=0`;
  notify();
}
