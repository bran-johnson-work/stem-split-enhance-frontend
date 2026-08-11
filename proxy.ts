import { NextResponse, type NextRequest } from "next/server";
import { isTokenExpired } from "@/lib/auth/jwt";
import { REFRESH_TOKEN_COOKIE, TOKEN_COOKIE } from "@/lib/auth/token";

/** Path prefixes that require a session. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/upload",
  // The in-app demo: the restoration pipeline. It creates a real project, consumes
  // real quota and occupies a shared GPU queue, so it needs a session — unlike the
  // public marketing `/demo`, which embeds the POC and stays anonymous.
  "/restoration",
  "/projects",
  "/settings",
  "/billing",
  "/admin",
];

/** Auth pages that a logged-in user shouldn't see. */
const AUTH_ONLY_PATHS = ["/login", "/signup"];

/**
 * Same-origin proxy for the Streamlit demo host.
 *
 * The site is served over HTTPS and the demo box is plain HTTP, so a browser
 * blocks the iframe as mixed content. Rewriting through our own origin removes
 * the scheme mismatch: to the browser it is one secure origin, and the plaintext
 * hop happens server-side where the mixed-content rule doesn't apply.
 *
 * Done here rather than with `next.config.ts` rewrites for one concrete reason:
 * `output: "standalone"` bakes rewrite destinations into the routes manifest at
 * BUILD time, so moving the demo box would mean rebuilding the image. Middleware
 * reads the env var per request, so the host is a container restart away.
 *
 * ⚠️ Two things this does NOT do:
 *
 * ⚠️ **WebSockets.** Streamlit talks over `/_stcore/stream`, and neither
 * middleware nor `rewrites` handle the HTTP `Upgrade` handshake. The shell will
 * paint and then sit at "Connecting". Terminate TLS in front of the Streamlit
 * box and point `NEXT_PUBLIC_DEMO_URL` at it if the demo has to actually run.
 *
 * The prefix is **stripped** on the way out, which is what lets this work
 * against an unmodified Streamlit (no `--server.baseUrlPath` needed). It relies
 * on Streamlit emitting *relative* asset URLs (`./static/…`), so they resolve
 * back under this prefix and come through here too. Two consequences:
 *
 *  - the iframe `src` must keep its **trailing slash** — `./static/x.js` from
 *    `/api/audio-proxy` resolves to `/static/x.js` (our root, a 404), while from
 *    `/api/audio-proxy/` it resolves to `/api/audio-proxy/static/x.js`;
 *  - `skipTrailingSlashRedirect` is therefore set in `next.config.ts`, or Next
 *    would 308 that slash away before this ever runs.
 */
const DEMO_PROXY_PREFIX = "/api/audio-proxy";

/**
 * Origin of the demo host.
 *
 * Falls back to `NEXT_PUBLIC_DEMO_URL` so a single variable configures both
 * halves: the client decides *whether* to proxy (anything not https goes through
 * here — see `lib/config.ts`), and this decides *where* to forward. Set
 * `DEMO_ORIGIN` only to point the two at different hosts.
 */
const DEMO_ORIGIN =
  process.env.DEMO_ORIGIN ||
  process.env.NEXT_PUBLIC_DEMO_URL ||
  "http://3.145.34.87:8501";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Before the auth checks: the demo is public, and its asset requests must not
  // be measured against PROTECTED_PREFIXES.
  if (pathname === DEMO_PROXY_PREFIX || pathname.startsWith(`${DEMO_PROXY_PREFIX}/`)) {
    // "/api/audio-proxy/static/x.js" -> "/static/x.js"; the bare prefix -> "/".
    const upstreamPath = pathname.slice(DEMO_PROXY_PREFIX.length) || "/";
    const headers = new Headers(request.headers);

    // Our own Host would be forwarded verbatim otherwise, and a tunnel or vhost
    // upstream routes on it — ngrok answers "not found" for a Host it doesn't
    // serve. Dropping it lets fetch set the destination's own.
    headers.delete("host");

    // Free ngrok tunnels answer any browser User-Agent with an interstitial
    // warning page (ERR_NGROK_6024) instead of the app, which would render
    // inside the iframe as ngrok's own "You are about to visit…" screen. The
    // documented opt-out is this header — and setting it is the one thing an
    // iframe cannot do for itself, which is why the proxy stays in the path even
    // though the tunnel is already HTTPS.
    headers.set("ngrok-skip-browser-warning", "true");

    return NextResponse.rewrite(
      new URL(`${upstreamPath}${request.nextUrl.search}`, DEMO_ORIGIN),
      { request: { headers } },
    );
  }

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
  matcher: [
    // The demo proxy, listed explicitly because the general pattern below
    // excludes both `api/` and anything with a file extension — and Streamlit's
    // own assets (`…/static/js/main.abc.js`) are exactly that.
    "/api/audio-proxy",
    "/api/audio-proxy/:path*",
    // Run on everything except Next internals, API routes, and static files.
    "/((?!_next/static|_next/image|api/|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
