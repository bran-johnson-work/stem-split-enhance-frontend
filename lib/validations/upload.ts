import { formatBytes } from "@/lib/format";

// Kept in lockstep with the backend: the storage bucket enforces a 50 MB cap and
// only the MIME types in the API's `AudioContentType` enum (see docs/API doc.yaml).
// Declaring anything else gets rejected with 400 at sign time / 400 at PUT time.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

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

export function validateAudioFile(file: File): FileValidation {
  const name = file.name.toLowerCase();
  const extOk = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const typeOk = file.type ? ACCEPTED_MIME_TYPES.includes(file.type) : false;
  if (!extOk && !typeOk) {
    return {
      ok: false,
      error: `Unsupported file type. Upload a ${ACCEPTED_LABEL} file.`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File is too large (${formatBytes(file.size)}). Max size is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "That file appears to be empty." };
  }
  return { ok: true };
}
