import type { ForgotValues, ResetValues } from "@/lib/validations/auth";

// Password-reset mocks. DEFERRED: the API doc exposes no forgot/reset-password
// endpoint, so these two flows stay mock until the backend adds them. Login,
// signup, logout and email verification now run through lib/api/auth.ts.

const delay = (ms = 800) => new Promise((r) => setTimeout(r, ms));

export async function mockRequestReset(_values: ForgotValues) {
  await delay();
  return { ok: true as const };
}

export async function mockResetPassword(_values: ResetValues) {
  await delay();
  return { ok: true as const };
}
