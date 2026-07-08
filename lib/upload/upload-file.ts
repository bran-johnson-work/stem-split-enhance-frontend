// Uploader seam. The queue (lib/hooks/use-upload-queue.ts) is written against the
// `Uploader` contract and never knows *how* a file is transferred — a simulated
// transfer (no backend) or a real presigned PUT to Supabase Storage. The
// project-aware presigned uploader is assembled in lib/upload/upload-batch.ts;
// this module holds the transport primitives it (and the simulator) build on.

export interface UploadResult {
  /** Path of the object in storage, e.g. `<user>/<project>/<filename>`. */
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
 * presigned Supabase path (`XMLHttpRequest`, not `fetch`, because only XHR
 * exposes upload-progress events). `contentType` must match the value declared
 * when the upload URL was signed; no `Authorization` header is sent (the signed
 * URL carries its own single-use token).
 */
export function xhrUpload(
  url: string,
  file: File,
  { onProgress, signal }: UploadHandlers,
  contentType?: string,
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

    xhr.setRequestHeader(
      "content-type",
      contentType || file.type || "application/octet-stream",
    );
    xhr.send(file);
  });
}
