import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (server.js + traced node_modules) so the
  // Docker runtime stage ships only what's actually imported, not the full deps.
  output: "standalone",
};

export default nextConfig;
