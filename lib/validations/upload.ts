import { formatBytes } from "@/lib/format";

// Allowed MIME types mirror the API's `AudioContentType` enum (see docs/API doc.yaml);
// declaring anything else gets rejected with 400 at sign time. The per-file SIZE cap is
// NOT hardcoded here — it's the caller's plan `max_file_size_mb`, enforced server-side by
// the S3 presign policy's `content-length-range`. Callers pass it into `validateAudioFile`.

interface AudioFormat {
  label: string;
  extensions: string[];
  /** Allowed MIME types. First entry is the canonical one we declare when signing. */
  mimeTypes: string[];
}

export const ACCEPTED_AUDIO: AudioFormat[] = [
  {
    label: "WAV",
    extensions: [".wav"],
    mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave"],
  },
  {
    label: "MP3",
    extensions: [".mp3"],
    mimeTypes: ["audio/mpeg", "audio/mp3"],
  },
  {
    label: "FLAC",
    extensions: [".flac"],
    mimeTypes: ["audio/flac", "audio/x-flac"],
  },
  {
    label: "M4A/AAC",
    extensions: [".m4a", ".mp4", ".aac"],
    mimeTypes: ["audio/mp4", "audio/aac"],
  },
  {
    label: "OGG",
    extensions: [".ogg", ".oga"],
    mimeTypes: ["audio/ogg"],
  },
  {
    label: "WebM",
    extensions: [".webm"],
    mimeTypes: ["audio/webm"],
  },
];

export const ACCEPTED_EXTENSIONS = ACCEPTED_AUDIO.flatMap((f) => f.extensions);
export const ACCEPTED_MIME_TYPES = ACCEPTED_AUDIO.flatMap((f) => f.mimeTypes);

export const ACCEPT_ATTR = [...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME_TYPES].join(
  ",",
);

export const ACCEPTED_LABEL = (() => {
  const labels = ACCEPTED_AUDIO.map((f) => f.label);
  return `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}`;
})();

/**
 * The MIME type to declare when requesting an upload URL. The backend requires a
 * value from its `AudioContentType` enum, and the storage `PUT` must send the
 * same value — so prefer the browser's `file.type` when it's an accepted type,
 * otherwise infer the canonical type from the file extension.
 */
export function audioContentType(file: File): string {
  if (file.type && ACCEPTED_MIME_TYPES.includes(file.type)) return file.type;
  const name = file.name.toLowerCase();
  const format = ACCEPTED_AUDIO.find((f) =>
    f.extensions.some((ext) => name.endsWith(ext)),
  );
  return format?.mimeTypes[0] ?? "audio/mpeg";
}

export type FileValidation = { ok: true } | { ok: false; error: string };

/**
 * Validate a candidate upload against the accepted formats and — when known — the
 * caller's plan per-file size ceiling. `maxBytes` comes from the active plan's
 * `maxFileSizeMb`; pass `undefined` while the plan is still loading, in which case
 * the size check is skipped (fail open) and the backend presign policy is the
 * authority. Nothing here assumes a fixed cap.
 */
export function validateAudioFile(
  file: File,
  maxBytes?: number,
): FileValidation {
  const name = file.name.toLowerCase();
  const extOk = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const typeOk = file.type ? ACCEPTED_MIME_TYPES.includes(file.type) : false;
  if (!extOk && !typeOk) {
    return {
      ok: false,
      error: `Unsupported file type. Upload a ${ACCEPTED_LABEL} file.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "That file appears to be empty." };
  }
  if (maxBytes != null && file.size > maxBytes) {
    return {
      ok: false,
      error: `File is too large (${formatBytes(file.size)}). Your plan allows up to ${formatBytes(maxBytes)}.`,
    };
  }
  return { ok: true };
}
