// Downloader seam. The delivery UI (components/delivery) is written against the
// `Downloader` contract and never knows *how* a file reaches the user's disk — a
// simulated transfer (no backend) or a real browser download. Mirrors the
// `Uploader` seam in lib/upload/upload-file.ts.
//
// Why simulate: with no backend the fixtures' stem URLs (`/mock/<id>/vocals.wav`)
// point at objects that don't exist, so a real anchor click would 404. The
// simulator keeps the whole download UX (pending state, per-file and
// download-all flows, toasts) exercisable without fabricating audio assets.

import { USE_REAL_BACKEND } from "@/lib/config";

export interface DownloadTarget {
  /** Where the bytes live — a public path or a short-lived signed URL. */
  url: string;
  /** Name to save the file as. */
  filename: string;
}

export type Downloader = (target: DownloadTarget) => Promise<void>;

/** How long the simulated transfer holds its pending state. */
const SIM_MS = 600;

/**
 * Default downloader — resolves after a beat without navigating anywhere, so the
 * UI can show a pending → done cycle against fixture URLs that have no bytes
 * behind them.
 */
export const simulatedDownloader: Downloader = () =>
  new Promise((resolve) => setTimeout(resolve, SIM_MS));

/**
 * Real download: a programmatic anchor click, which keeps the browser's own
 * download manager in charge (no blob buffering, works for large stems).
 *
 * Caveat for the backend integration: `download` is only honoured for same-origin
 * URLs. A cross-origin signed URL (e.g. Supabase Storage) ignores the attribute
 * and the browser falls back to navigating/inlining, using the object's own name.
 * Supabase honours a `?download=<filename>` query param for exactly this; wire it
 * where the URL is signed, not here.
 */
export const anchorDownload: Downloader = async ({ url, filename }) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
};

/** True when downloads are faked because no backend is configured. */
export const IS_SIMULATED_DOWNLOAD = !USE_REAL_BACKEND;

/** The active downloader, chosen by env — the single swap point. */
export const downloadFile: Downloader = USE_REAL_BACKEND
  ? anchorDownload
  : simulatedDownloader;
