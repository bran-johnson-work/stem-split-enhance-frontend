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
 * URL of the Streamlit demo (stem separation + audio enhancement) that `/demo`
 * embeds.
 *
 * Defaults to a **same-origin path**, not the demo host itself. The host is
 * plain HTTP and this site is HTTPS, so a direct `src` is blocked as mixed
 * content; `proxy.ts` rewrites this prefix to the real origin server-side, where
 * that rule doesn't apply. The plaintext address stays in `DEMO_ORIGIN`, which
 * is server-only and never shipped to the browser.
 *
 * Set `NEXT_PUBLIC_DEMO_URL` to an absolute **https** origin to bypass the proxy
 * entirely — the better end state, because the proxy cannot carry Streamlit's
 * WebSocket (see the note in `proxy.ts`).
 */
/** Same-origin path that `proxy.ts` rewrites to the demo host. */
export const DEMO_PROXY_PATH = "/api/audio-proxy";

/**
 * The demo host as configured, which may be a plain-HTTP address. Used for the
 * "open in a new tab" links (a top-level navigation to http:// is fine — mixed
 * content only applies to subresources like an iframe) and for the address
 * shown in the embed's toolbar.
 */
export const DEMO_HOST_URL = (process.env.NEXT_PUBLIC_DEMO_URL || "").replace(
  /\/+$/,
  "",
);

/**
 * Free ngrok tunnels serve an interstitial warning page to any browser
 * User-Agent instead of the app (`ERR_NGROK_6024`). Framing one directly shows
 * ngrok's "You are about to visit…" screen, so these keep going through the
 * proxy — which suppresses the interstitial with a request header the iframe
 * has no way to send. A paid ngrok domain has no interstitial and is embedded
 * directly like any other HTTPS host.
 */
const isNgrokFreeTunnel = /^https:\/\/[^/]*\.ngrok-free\.app$/i.test(DEMO_HOST_URL);

/** Escape hatch: force the proxy for any host that needs header injection. */
const forceProxy = process.env.NEXT_PUBLIC_DEMO_FORCE_PROXY === "true";

/**
 * What the iframe actually loads.
 *
 * An HTTPS origin the browser can frame unaided is embedded directly; anything
 * else — blank, plain HTTP, or a free ngrok tunnel — goes through the
 * same-origin proxy. That rule is the point: `NEXT_PUBLIC_DEMO_URL` can hold the
 * real address in every case without ever producing a blocked or hijacked frame,
 * and the day the demo host gets a proper certificate the same variable starts
 * bypassing the proxy on its own.
 */
export const DEMO_URL =
  DEMO_HOST_URL.startsWith("https://") && !isNgrokFreeTunnel && !forceProxy
    ? DEMO_HOST_URL
    : DEMO_PROXY_PATH;

/**
 * `DEMO_URL` with Streamlit's `embed=true` flag, which strips the hamburger
 * menu, footer and "Made with Streamlit" badge so the frame reads as part of
 * our page rather than a third-party app.
 *
 * Built by string concatenation rather than `new URL`: `DEMO_URL` is now
 * relative by default, and `new URL` throws on a relative input unless given a
 * base — which does not exist during SSR.
 *
 * The trailing slash is deliberate and load-bearing. Streamlit's document
 * references its assets relatively (`./static/…`), so `/api/audio-proxy/` keeps
 * them under the proxy prefix while `/api/audio-proxy` would send them to our
 * own root, where they 404. `next.config.ts` disables the trailing-slash
 * redirect so the browser can actually hold that URL.
 */
export function demoEmbedUrl(): string {
  return `${DEMO_URL}/?embed=true`;
}

/**
 * Where "open in a new tab" should point: the real host when we know it, else
 * the proxy. A top-level navigation to `http://` is not mixed content, so this
 * link can go straight to the box even when the iframe cannot.
 */
export function demoExternalUrl(): string {
  return DEMO_HOST_URL || DEMO_PROXY_PATH;
}

/** Host to print in the embed's toolbar — the real one, not the proxy path. */
export function demoDisplayHost(): string {
  return (DEMO_HOST_URL || DEMO_PROXY_PATH).replace(/^https?:\/\//, "");
}

/**
 * True when the browser would silently blank the iframe: an HTTPS page cannot
 * embed an HTTP frame (mixed content). Callers render an "open in a new tab"
 * fallback instead of an empty box. Always false during SSR.
 *
 * With the default same-origin `DEMO_URL` this is always false — the proxy is
 * what makes it so. It still guards the case where `NEXT_PUBLIC_DEMO_URL` is
 * pointed straight at an `http://` host.
 */
export function isDemoBlockedByMixedContent(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:" && DEMO_URL.startsWith("http://");
}
