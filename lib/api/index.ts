import { MockApi, type KlearNoteApi } from "@/lib/api/client";

// Swap point: when the backend lands, gate this on an env flag, e.g.
//   export const api = process.env.NEXT_PUBLIC_USE_MOCK === "false"
//     ? new HttpApi(process.env.NEXT_PUBLIC_API_URL!)
//     : new MockApi();
export const api: KlearNoteApi = new MockApi();
