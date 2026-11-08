import { NextResponse, type NextRequest } from "next/server";
import { isTokenExpired } from "@/lib/auth/jwt";
import { REFRESH_TOKEN_COOKIE, TOKEN_COOKIE } from "@/lib/auth/token";

/** Path prefixes that require a session. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/upload",
  "/projects",
  "/settings",
  "/billing",
  "/admin",
];

/** Auth pages that a logged-in user shouldn't see. */
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // An expired *access* token is not the end of a session — the client trades
  // the refresh token for a new one on the first 401. So a session exists when
  // the access token is live, OR a refresh token is present to revive it. This
  // is also what carries a login across a browser restart: the access cookie is
  // session-scoped and gone, the refresh cookie persists.
  //
  // Only when neither holds is the session really over, and only then is the
  // signed-in shell worth avoiding (it would render and 401 on every request).
  const accessLive = Boolean(token) && !isTokenExpired(token!);
  const hasSession = accessLive || Boolean(refreshToken);
  const expired = !hasSession && Boolean(token);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    if (expired) url.searchParams.set("expired", "1");

    const response = NextResponse.redirect(url);
    // Drop the dead cookie on the way out, so a reload doesn't repeat the trip.
    if (expired) response.cookies.delete(TOKEN_COOKIE);
    return response;
  }

  if (hasSession && AUTH_ONLY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, API routes, and static files.
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|.*\\.[\\w]+$).*)"],
};
