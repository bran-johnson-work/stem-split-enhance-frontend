import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (server.js + traced node_modules) so the
  // Docker runtime stage ships only what's actually imported, not the full deps.
  output: "standalone",

  // `/demo` used to embed the Streamlit POC. The signed-in Demo page runs the same
  // V2→V3 pipeline through the real API, so the embed was retired — but the old URL
  // is public and linked from outside, so it redirects rather than 404s. Permanent:
  // the page is not coming back. Unauthenticated visitors land on
  // /login?next=/restoration and arrive at the demo once they sign in.
  async redirects() {
    return [{ source: "/demo", destination: "/restoration", permanent: true }];
  },
};

export default nextConfig;
