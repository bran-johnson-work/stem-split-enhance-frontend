// Central client-side fetch for our own API routes and Dakota's backend. It's a
// thin JSON wrapper that also does the two things every backend call needs:
//   1. attaches the `Authorization: Bearer <token>` header from the auth cookie, and
//   2. normalises error bodies — FastAPI's `{ detail }` envelope (string, or the
//      structured 422 validation list) AND our own routes' `{ error }` shape.
// Routing every call through here keeps auth wiring and error handling in one place.

import { getRefreshToken, getToken, setRefreshToken, setToken } from "@/lib/auth/token";
import { apiUrl } from "@/lib/config";

export interface ApiFetchInit extends Omit<RequestInit, "body"> {
  /** JSON body — serialized and sent with a `content-type: application/json` header. */
  json?: unknown;
  /** Form body — sent as `application/x-www-form-urlencoded` (e.g. OAuth2 login). */
  form?: Record<string, string>;
  /** Skip attaching the bearer token (e.g. login/register, which have no token yet). */
  anonymous?: boolean;
}

/** FastAPI 422 validation entry. */
interface ValidationDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/** Pull a human-readable message out of whatever error shape the response used. */
function messageFromBody(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const body = data as {
      detail?: string | ValidationDetail[];
      error?: string;
    };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      // Structured validation error — surface the first field's message.
      return body.detail.map((d) => d.msg).join("; ");
    }
    if (typeof body.error === "string") return body.error;
  }
  return `Request failed (${status})`;
}

/**
 * In-flight refresh, shared by every caller.
 *
 * When an access token expires, several requests usually 401 at once (a list, a
 * poll, the current user). Without this they would each POST /auth/refresh —
 * and since the backend rotates single-use tokens, the first would succeed and
 * the rest would present an already-used token, which reads as *theft* and logs
 * the user out of every device. Single-flighting is what makes rotation safe.
 */
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Trade the refresh token for a new access token. Resolves to the new token, or
 * null when the session is genuinely over (no refresh token, or the backend
 * rejected it).
 *
 * Uses bare `fetch`, not `apiFetch`: this call must never recurse into the
 * 401-refresh path it exists to serve.
 */
async function requestRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!data.access_token) return null;

    setToken(data.access_token);
    // The old refresh token is now spent; losing the replacement would end the
    // session at the next refresh.
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    return data.access_token;
  } catch {
    // Network failure — indistinguishable from a dead session to us, but the
    // caller's 401 will surface either way.
    return null;
  }
}

function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiFetch<T>(
  input: string,
  init: ApiFetchInit = {},
): Promise<T> {
  return request<T>(input, init, false);
}

async function request<T>(
  input: string,
  init: ApiFetchInit,
  isRetry: boolean,
): Promise<T> {
  const { json, form, anonymous, headers, ...rest } = init;

  const token = anonymous ? null : getToken();

  let body: BodyInit | undefined;
  const contentType: Record<string, string> = {};
  if (json !== undefined) {
    body = JSON.stringify(json);
    contentType["content-type"] = "application/json";
  } else if (form !== undefined) {
    body = new URLSearchParams(form).toString();
    contentType["content-type"] = "application/x-www-form-urlencoded";
  }

  const res = await fetch(input, {
    ...rest,
    headers: {
      ...contentType,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body,
  });

  // An expired access token is recoverable: refresh once, then replay the
  // original request with the new token. Only a failed refresh is a real 401,
  // and only that reaches the caller (and so the redirect-to-login handler).
  if (res.status === 401 && !anonymous && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(input, init, true);
  }

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      // non-JSON body — messageFromBody falls back to the status code
    }
    const error = new Error(messageFromBody(data, res.status)) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}
