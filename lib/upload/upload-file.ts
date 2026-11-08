// Uploader seam. The queue (lib/hooks/use-upload-queue.ts) is written against the
// `Uploader` contract and never knows *how* a file is transferred — a simulated
// transfer (no backend) or a real presigned POST direct to S3. The
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
 * Real, transport-level upload with progress — the building block for the S3
 * presigned-POST path.
 *
 * Two constraints shape this function:
 *   • `XMLHttpRequest`, not `fetch`, because only XHR exposes upload-progress
 *     events (`fetch` has no equivalent until request streams ship broadly).
 *   • The body is `multipart/form-data` with **every signed `fields` entry
 *     appended before the `file` part** — S3 parses the policy positionally and
 *     rejects the POST if `file` comes first. No `content-type` header is set
 *     by hand: the browser must add its own multipart boundary, and no
 *     `Authorization` header is sent (the policy is the credential).
 *
 * S3 answers a successful presigned POST with **204 No Content** (or 201 when
 * the policy asked for it), so any 2xx counts as success.
 */
export function xhrUploadPost(
  url: string,
  fields: Record<string, string>,
  storageKey: string,
  file: File,
  { onProgress, signal }: UploadHandlers,
): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());

    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    form.append("file", file); // must be last — S3 ignores anything after it

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      signal.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve({ storagePath: storageKey });
      } else {
        reject(new Error(s3ErrorMessage(xhr)));
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

    xhr.send(form);
  });
}

/**
 * S3 rejects a policy violation with an XML `<Error><Message>…` body rather than
 * JSON, so the useful part has to be dug out by hand. The common case is a file
 * bigger than the plan's limit tripping the policy's `content-length-range`,
 * which we translate into copy a user can act on.
 */
function s3ErrorMessage(xhr: XMLHttpRequest): string {
  const body = typeof xhr.responseText === "string" ? xhr.responseText : "";
  const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1];

  if (code === "EntityTooLarge") {
    return "That file is larger than your plan allows.";
  }
  if (code === "AccessDenied" || xhr.status === 403) {
    // Presigned policies are short-lived; an expired one lands here.
    return "The upload link expired. Please try the upload again.";
  }
  const message = /<Message>([^<]+)<\/Message>/.exec(body)?.[1];
  return message ?? `Upload failed (${xhr.status})`;
}
