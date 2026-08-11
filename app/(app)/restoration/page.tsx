"use client";

// /restoration — the V2 + V3 audio restoration pipeline. Shown in the sidebar as
// "Demo", because this is the run we demonstrate; the route keeps its own name so
// it never collides with the public marketing /demo page.
//
// Repairs and enhances a single track, backed by a separate GPU service the
// browser reaches only through our own API. All behaviour lives in the component.

import { RestorationRunner } from "@/components/restoration/restoration-runner";

export default function RestorationPage() {
  return <RestorationRunner />;
}
