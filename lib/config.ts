// Runtime configuration derived from public env vars. Centralised so the
// "are we talking to the real backend, or running fully mock?" decision is made
// in exactly one place and imported everywhere it matters.

/**
 * Base URL of Dakota's FastAPI backend, e.g. `http://localhost:8000`.
 * When unset the app runs fully mock (simulated auth/upload/projects) so the
 * UI is usable with no backend. Trailing slashes are trimmed.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(
  /\/+$/,
  "",
);

/** True when a real backend is configured. Gates real-vs-mock behaviour. */
export const USE_REAL_BACKEND = API_URL.length > 0;

/** Version prefix every backend route sits under. */
export const API_V1 = "/api/v1";

/** Absolute URL for a backend path, e.g. `apiUrl("/auth/login")`. */
export function apiUrl(path: string): string {
  return `${API_URL}${API_V1}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Emails granted the admin role in the UI. The backend's user model has no
 * role field, so admin is assigned client-side from this allowlist until a
 * real roles endpoint exists.
 */
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
