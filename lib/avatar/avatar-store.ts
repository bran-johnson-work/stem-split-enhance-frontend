// Where a user's avatar image lives. A seam, in the same spirit as Uploader
// (lib/upload), Downloader (lib/download) and AudioSource (lib/audio): the UI
// talks to this interface, so the storage mechanism can change underneath it.
//
// Two implementations, picked by USE_REAL_BACKEND:
//   • httpAvatarStore — real backend. Uploads the image straight to S3 via a
//     presigned POST (same transport as audio), then records it on the user;
//     the avatar becomes a per-user signed URL on UserResponse.avatar_url.
//   • localAvatarStore — no backend. Downscales to a 256px square and persists a
//     data URL in localStorage (device-local; overlaid in lib/api/auth).

import {
  completeAvatarUpload,
  deleteAvatar,
  requestAvatarUploadUrl,
} from "@/lib/api/users";
import { USE_REAL_BACKEND } from "@/lib/config";
import { formatBytes } from "@/lib/format";
import { xhrUploadPost } from "@/lib/upload/upload-file";
import type { FileValidation } from "@/lib/validations/upload";

export interface AvatarStore {
  /** Store `file` as the current avatar and return a URL the UI can render. */
  upload(file: File): Promise<string>;
  /** Drop the stored avatar. */
  remove(): Promise<void>;
}

const STORAGE_KEY = "klearnote:avatar";

/** Rendered size of the avatar we keep — big enough for a retina 128px display. */
const AVATAR_PX = 256;

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"];

export const ACCEPTED_IMAGE_LABEL = "PNG, JPG or WebP";

export const AVATAR_ACCEPT_ATTR = ACCEPTED_IMAGE_MIME.join(",");

export function validateAvatarFile(file: File): FileValidation {
  if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
    return {
      ok: false,
      error: `Unsupported image type. Use a ${ACCEPTED_IMAGE_LABEL} file.`,
    };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return {
      ok: false,
      error: `Image is too large (${formatBytes(file.size)}). Max size is ${formatBytes(MAX_AVATAR_BYTES)}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "That image appears to be empty." };
  }
  return { ok: true };
}

/**
 * Centre-crop to a square and downscale to AVATAR_PX. Keeps what we persist to
 * a few KB — a 2 MB original would otherwise blow past the localStorage quota
 * once base64-encoded — and is the resize a real backend would do anyway.
 */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_PX;
    canvas.height = AVATAR_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that image.");
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
    return canvas.toDataURL("image/webp", 0.9);
  } finally {
    bitmap.close();
  }
}

/** The stored avatar data URL, or null if none / not in the browser. */
export function readStoredAvatar(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private mode / storage disabled
  }
}

export const localAvatarStore: AvatarStore = {
  async upload(file: File) {
    const check = validateAvatarFile(file);
    if (!check.ok) throw new Error(check.error);
    const dataUrl = await toAvatarDataUrl(file);
    try {
      window.localStorage.setItem(STORAGE_KEY, dataUrl);
    } catch {
      throw new Error("Couldn't save that image on this device.");
    }
    return dataUrl;
  },

  async remove() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing stored / storage disabled — the avatar is already gone
    }
  },
};

/**
 * Real backend: upload the chosen image directly to S3 through a presigned POST,
 * then finalise it on the user. Returns the fresh signed avatar URL the API
 * hands back. The bytes never pass through our API, mirroring the audio upload.
 */
export const httpAvatarStore: AvatarStore = {
  async upload(file: File) {
    const check = validateAvatarFile(file);
    if (!check.ok) throw new Error(check.error);

    const signed = await requestAvatarUploadUrl(file.type);
    await xhrUploadPost(signed.url, signed.fields, signed.storage_key, file, {
      onProgress: () => {},
      signal: new AbortController().signal,
    });
    const user = await completeAvatarUpload();
    return user.avatarUrl ?? "";
  },

  async remove() {
    await deleteAvatar();
  },
};

/** The active store — real presigned upload when a backend is configured. */
export const avatarStore: AvatarStore = USE_REAL_BACKEND
  ? httpAvatarStore
  : localAvatarStore;
