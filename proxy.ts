import { NextResponse, type NextRequest } from "next/server";
import { TOKEN_COOKIE } from "@/lib/auth/token";

// Server-side route guard (Next 16 "proxy" convention — the successor to
// middleware). Reads the (JS-readable) auth cookie and:
//   • bounces unauthenticated visitors off the (app) routes to /login, and
//   • bounces already-authenticated visitors off /login and /signup to /dashboard.
// Password-reset and email-verification pages stay reachable in either state.
//
// This is presence-only (does the cookie exist). Token validity/expiry is
// enforced by the backend, which returns 401 and prompts a fresh login.

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
  const hasToken = Boolean(request.cookies.get(TOKEN_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasToken && AUTH_ONLY_PATHS.includes(pathname)) {
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
