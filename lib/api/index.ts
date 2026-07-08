import { MockApi, type KlearNoteApi } from "@/lib/api/client";
import { HttpApi } from "@/lib/api/http";
import { USE_REAL_BACKEND } from "@/lib/config";

// The active API. With a backend configured (NEXT_PUBLIC_API_URL set) real
// endpoints back the current user + projects; billing/admin fall through to the
// mock inside HttpApi. Unset → fully mock.
export const api: KlearNoteApi = USE_REAL_BACKEND ? new HttpApi() : new MockApi();
