// The contract between the browser uploader and whoever mints the signed upload
// URL — our Next.js route today (app/api/uploads/sign), Dakota's backend later.
// Both signers implement this exact request/response shape, so switching from one
// to the other (see `selectUploader` in lib/upload/upload-file.ts) is an endpoint
// change with no client-side rework. Keep this file the single source of truth
// for that shape and share it with any future server implementation.

export interface SignUploadRequest {
  fileName: string;
  contentType: string;
  size: number;
}

export interface SignUploadResponse {
  /** Absolute URL to PUT the file bytes to — points straight at Supabase Storage. */
  signedUrl: string;
  /**
   * Canonical object path inside the bucket. The signer owns this (it scopes the
   * path and, once auth is real, ties it to the user); the client treats it as
   * opaque and forwards it verbatim to createProject. Never generate it client-side.
   */
  path: string;
}
