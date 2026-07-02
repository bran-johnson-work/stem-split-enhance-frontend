import { formatBytes } from "@/lib/format";

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

interface AudioFormat {
  label: string;
  extensions: string[];
  mimeTypes: string[];
}

export const ACCEPTED_AUDIO: AudioFormat[] = [
  {
    label: "WAV",
    extensions: [".wav"],
    mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"],
  },
  {
    label: "MP3",
    extensions: [".mp3"],
    mimeTypes: ["audio/mpeg", "audio/mp3"],
  },
  {
    label: "AIFF",
    extensions: [".aif", ".aiff"],
    mimeTypes: ["audio/aiff", "audio/x-aiff"],
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
