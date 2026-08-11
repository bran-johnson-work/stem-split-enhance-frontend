import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (server.js + traced node_modules) so the
  // Docker runtime stage ships only what's actually imported, not the full deps.
  output: "standalone",

  // Keep `/api/audio-proxy/` from being 308'd to `/api/audio-proxy`. The demo
  // iframe proxied by `proxy.ts` serves a document whose asset URLs are relative
  // (`./static/…`), so the trailing slash is load-bearing: without it every
  // asset resolves against our root instead of the proxy prefix and 404s.
  // No route in this app depends on the redirect, and links are written without
  // trailing slashes anyway, so disabling it globally costs nothing.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
