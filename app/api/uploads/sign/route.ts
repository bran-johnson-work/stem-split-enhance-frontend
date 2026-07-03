import { NextResponse } from "next/server";
import { getStorageBucket } from "@/lib/supabase/admin";
import type {
  SignUploadRequest,
  SignUploadResponse,
} from "@/lib/upload/sign-contract";
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/validations/upload";

// Mints a short-lived, single-use Supabase Storage upload URL for a validated
// file. This is the frontend-owned stand-in for Dakota's future signing endpoint
// — it implements the shared SignUpload contract, so it doubles as the executable
// spec for what his backend must return.
//
// TODO(auth): once real auth lands, read the session here, reject anonymous
// callers, and scope `path` to the user id (with RLS enforced on the bucket).
// Until then uploads land under an `anon/` prefix.

export const runtime = "nodejs";

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return (
    base
      .replace(/[^\w.\- ]+/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 128) || "file"
  );
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: Partial<SignUploadRequest>;
  try {
    body = (await request.json()) as Partial<SignUploadRequest>;
  } catch {
    return bad("Invalid JSON body.");
  }

  const { fileName, contentType, size } = body;
  if (typeof fileName !== "string" || typeof size !== "number") {
    return bad("fileName and size are required.");
  }

  // Re-validate server-side against the same rules the client enforces — never
  // trust the browser to have checked type/size.
  const lower = fileName.toLowerCase();
  const extOk = ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const typeOk = contentType ? ACCEPTED_MIME_TYPES.includes(contentType) : false;
  if (!extOk && !typeOk) return bad("Unsupported file type.");
  if (size <= 0) return bad("That file appears to be empty.");
  if (size > MAX_UPLOAD_BYTES) return bad("File exceeds the maximum size.", 413);

  // The signer owns the path; a fresh UUID prevents collisions and makes retries
  // idempotent (no upsert needed).
  const path = `anon/${crypto.randomUUID()}/${sanitizeFileName(fileName)}`;

  try {
    const bucket = getStorageBucket();
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error || !data) {
      throw error ?? new Error("Failed to sign upload URL.");
    }
    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path ?? path,
    } satisfies SignUploadResponse);
  } catch (err) {
    // Missing-env config errors and Supabase failures both surface here.
    const message =
      err instanceof Error ? err.message : "Failed to sign upload URL.";
    return bad(message, 500);
  }
}
