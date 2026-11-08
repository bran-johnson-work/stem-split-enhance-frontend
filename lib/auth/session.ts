

import { clearToken, hasSession } from "@/lib/auth/token";

 
let redirecting = false;

export function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  if (redirecting) return;
  // `hasSession`, not `getToken`: a returning user may hold only a refresh
  // token, and if that refresh has just failed they still need the redirect.
  if (!hasSession()) return;

  redirecting = true;
  clearToken();

  const { pathname, search } = window.location;
  const params = new URLSearchParams({ expired: "1" });
  params.set("next", `${pathname}${search}`);

  window.location.assign(`/login?${params.toString()}`);
}
