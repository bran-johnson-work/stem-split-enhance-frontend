"use client";

// /restoration — the V2 + V3 audio restoration pipeline. Shown in the sidebar as
// "Demo": it is the run we demonstrate, and the public /demo (which used to embed
// the Streamlit POC) now permanently redirects here.
//
// Repairs and enhances a single track, backed by a separate GPU service the
// browser reaches only through our own API. All behaviour lives in the component.

import { RestorationRunner } from "@/components/restoration/restoration-runner";

export default function RestorationPage() {
  return <RestorationRunner />;
}
