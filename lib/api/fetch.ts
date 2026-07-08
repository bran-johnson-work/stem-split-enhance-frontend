// Central client-side fetch for our own API routes and Dakota's backend. It's a
// thin JSON wrapper that also does the two things every backend call needs:
//   1. attaches the `Authorization: Bearer <token>` header from the auth cookie, and
//   2. normalises error bodies — FastAPI's `{ detail }` envelope (string, or the
//      structured 422 validation list) AND our own routes' `{ error }` shape.
// Routing every call through here keeps auth wiring and error handling in one place.

import { getToken } from "@/lib/auth/token";

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

export async function apiFetch<T>(
  input: string,
  init: ApiFetchInit = {},
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
