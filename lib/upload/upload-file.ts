// Uploader seam. The queue (lib/hooks/use-upload-queue.ts) is written against
// the `Uploader` contract and never knows *how* a file is transferred — it may be
// a simulated transfer (no backend) or a real presigned PUT to Supabase Storage.
// Swapping one for the other is a single change in `selectUploader`.

import { apiFetch } from "@/lib/api/fetch";
import type {
  SignUploadRequest,
  SignUploadResponse,
} from "@/lib/upload/sign-contract";

export interface UploadResult {
  /** Path of the object in storage, e.g. `uploads/<uuid>/<filename>`. */
  storagePath: string;
  /** Public/download URL, when the backend returns one. */
  url?: string;
}

export interface UploadHandlers {
  onProgress: (pct: number) => void;
  signal: AbortSignal;
}

export type Uploader = (
  file: File,
  handlers: UploadHandlers,
) => Promise<UploadResult>;

/** Rejection thrown when an in-flight upload is canceled. */
export function abortError() {
  return new DOMException("Upload canceled", "AbortError");
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

const SIM_MIN_MS = 1500;
const SIM_MAX_MS = 4000;
const SIM_TICK_MS = 120;

/**
 * Default uploader — fakes a network transfer so the full queue UX (progress,
 * concurrency, cancel/retry) works with no backend. Duration scales with file
 * size so bigger files visibly take longer, clamped to a pleasant range.
 */
export const simulatedUploader: Uploader = (file, { onProgress, signal }) =>
  new Promise<UploadResult>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());

    const sizeFactor = Math.min(file.size / (50 * 1024 * 1024), 1); // 0..1 at 50MB+
    const durationMs = SIM_MIN_MS + sizeFactor * (SIM_MAX_MS - SIM_MIN_MS);
    const started = Date.now();

    const finish = () => {
      clearInterval(timer);
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      finish();
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort);

    onProgress(0);
    const timer = setInterval(() => {
      const pct = Math.min(
        99,
        Math.round(((Date.now() - started) / durationMs) * 100),
      );
      onProgress(pct);
      if (Date.now() - started >= durationMs) {
        finish();
        onProgress(100);
        resolve({ storagePath: `uploads/${crypto.randomUUID()}/${file.name}` });
      }
    }, SIM_TICK_MS);
  });

/**
 * Real, transport-level PUT with progress — the reusable building block for the
 * future Supabase path (`XMLHttpRequest`, not `fetch`, because only XHR exposes
 * upload progress events). Not wired into `selectUploader` yet.
 */
export function xhrUpload(
  url: string,
  file: File,
  { onProgress, signal }: UploadHandlers,
): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      signal.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve({ storagePath: url });
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("Network error during upload"));
    };
    const onAbort = () => {
      xhr.abort();
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort);

    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

/**
 * Presigned uploader: ask a signer for a scoped upload URL, then stream the bytes
 * straight to Supabase Storage with progress. The signer is chosen by
 * `selectUploader` — our own Next.js route now, Dakota's backend later — but this
 * function is identical for both because they share the SignUpload contract.
 */
export function createPresignedUploader(signEndpoint: string): Uploader {
  return async (file, { onProgress, signal }) => {
    if (signal.aborted) throw abortError();

    // 1. Ask the signer for a scoped, single-use upload URL. The signer owns the
    //    object path; we treat it as opaque. The abort signal is forwarded so a
    //    cancel during signing (before any bytes move) rejects cleanly.
    const { signedUrl, path } = await apiFetch<SignUploadResponse>(signEndpoint, {
      method: "POST",
      signal,
      json: {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      } satisfies SignUploadRequest,
    });

    // 2. PUT the bytes with upload progress. (xhrUpload's own returned path is a
    //    placeholder — the signer's `path` below is the canonical one.)
    await xhrUpload(signedUrl, file, { onProgress, signal });

    // 3. Forward the signer's path verbatim to createProject.
    return { storagePath: path };
  };
}

/**
 * Chooses the active uploader from env, in priority order:
 *   1. `NEXT_PUBLIC_API_URL` set → Dakota's backend signs (and owns metadata).
 *   2. `NEXT_PUBLIC_SUPABASE_URL` set → our own /api/uploads/sign route signs
 *      (real Supabase Storage, service-role key server-side).
 *   3. neither → simulated transfer so the queue UX works with no backend.
 *
 * Only the sign endpoint moves between (1) and (2); the browser→Supabase upload
 * is identical, so switching to Dakota is a one-env-var change with no rework.
 */
export function selectUploader(): Uploader {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;
  if (backendUrl) {
    return createPresignedUploader(
      `${backendUrl.replace(/\/+$/, "")}/uploads/sign`,
    );
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return createPresignedUploader("/api/uploads/sign");
  }
  return simulatedUploader;
}
