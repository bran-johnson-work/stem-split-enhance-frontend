// Central client-side fetch for our own API routes and, later, Dakota's backend.
// Today it's a thin JSON wrapper; it's also the ONE place that will attach the
// Authorization header once real auth replaces the mock. Routing every backend
// call through it means auth wiring is a one-line change here, not a codebase sweep.

export interface ApiFetchInit extends Omit<RequestInit, "body"> {
  /** JSON body — serialized and sent with a `content-type: application/json` header. */
  json?: unknown;
}

export async function apiFetch<T>(
  input: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const { json, headers, ...rest } = init;

  const res = await fetch(input, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      // TODO(auth): attach `Authorization: Bearer <token>` here once real auth
      // lands. Every backend call already flows through this helper, so both our
      // route and Dakota's endpoint start receiving credentials from one edit.
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });

  if (!res.ok) {
    // Surface the endpoint's `{ error }` message when present so it reaches the
    // upload queue's error state; fall back to the status code otherwise.
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // non-JSON body — keep the status-code message
    }
    throw new Error(message);
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}
