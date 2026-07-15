// "Download all" — the zip-ready seam (KN-43).
//
// Today this fans out over the individual deliverables and hands each to the
// `Downloader`. That is the honest MVP behaviour: nothing server-side can zip a
// project yet, and zipping client-side would mean streaming every stem into the
// browser just to re-emit it (a ~100 MB round-trip, plus a zip dependency).
//
// When the backend grows an archive endpoint (`GET /projects/{id}/archive`
// returning a signed URL to a prepared zip), the swap is contained to this file:
// resolve the URL and pass one `DownloadTarget` to `downloadFile`. Nothing in
// components/delivery changes.

import { deliverables, downloadFilename } from "@/lib/delivery/deliverables";
import { downloadFile } from "@/lib/download/download-file";
import type { Project } from "@/lib/types";

/**
 * Gap between successive downloads. Browsers throttle — and Safari outright
 * blocks — bursts of programmatic anchor clicks fired in one tick.
 */
const STAGGER_MS = 350;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Download every deliverable, master first. Sequential (not `Promise.all`) so
 * the browser sees the clicks spaced out. Returns how many files were started.
 */
export async function downloadAll(project: Project): Promise<number> {
  const files = deliverables(project);
  for (const [index, stem] of files.entries()) {
    if (index > 0) await sleep(STAGGER_MS);
    await downloadFile({
      url: stem.url,
      filename: downloadFilename(project, stem),
    });
  }
  return files.length;
}
