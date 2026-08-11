"use client";

// /pipeline-demo — the signed-in entry to the end-to-end pipeline run.
//
// The same surface the public /demo page shows to authenticated visitors; this
// route exists so the team can reach it from the sidebar without going out to
// the marketing site. All of the behaviour lives in the shared component.

import { PipelineRunner } from "@/components/demo/pipeline-runner";

export default function PipelineDemoPage() {
  return <PipelineRunner />;
}
