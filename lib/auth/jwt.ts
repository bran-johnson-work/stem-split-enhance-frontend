// Reading the `exp` claim off the access token, without verifying it.
//
// This is deliberately signature-blind and must stay that way: the backend is
// the only thing that decides whether a token is *valid*. All we do here is
// notice that a token is definitely past its expiry so the app can send the
// user to log in instead of rendering a signed-in shell whose every request
// will 401. A forged `exp` buys an attacker nothing — the API still rejects the
// token.
//
// Runs in two places, so it uses only APIs both have: the browser and the edge
// runtime (proxy.ts). No Buffer, no jose, no Node crypto.

/** Seconds of leeway, so a token about to expire mid-flight counts as expired. */
const CLOCK_SKEW_SECONDS = 10;

/** The `exp` claim in seconds, or null if the token isn't a JWT / carries none. */
function readExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    // base64url → base64, then restore the padding atob requires.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims: unknown = JSON.parse(atob(padded));

    if (typeof claims !== "object" || claims === null) return null;
    const exp = (claims as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    // Malformed base64 or JSON — not something we can reason about.
    return null;
  }
}

/**
 * True only when the token is *provably* past its expiry.
 *
 * Anything unreadable returns false — an opaque token, or the mock-mode
 * `"mock-session"` string, is left for the API to judge rather than being
 * treated as expired and logging the user out of a working session.
 */
export function isTokenExpired(token: string): boolean {
  const exp = readExpiry(token);
  if (exp === null) return false;
  return Date.now() >= (exp - CLOCK_SKEW_SECONDS) * 1000;
}
