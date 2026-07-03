import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase access using the service-role key. The "server-only" import
// makes any accidental Client Component import a build error, so the key can never
// reach the browser. Used exclusively by app/api/uploads/sign to mint signed
// upload URLs; when Dakota's backend takes over signing, this whole file retires.

interface StorageEnv {
  url: string;
  serviceRoleKey: string;
  bucket: string;
}

function readEnv(): StorageEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    !bucket && "SUPABASE_STORAGE_BUCKET",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Supabase storage is not configured — missing ${missing.join(", ")}.`,
    );
  }

  return { url: url!, serviceRoleKey: serviceRoleKey!, bucket: bucket! };
}

/** Returns a service-role-scoped handle to the private uploads bucket. */
export function getStorageBucket() {
  const { url, serviceRoleKey, bucket } = readEnv();
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client.storage.from(bucket);
}
