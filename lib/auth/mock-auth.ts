import type {
  ForgotValues,
  LoginValues,
  ResetValues,
  SignupValues,
} from "@/lib/validations/auth";

const delay = (ms = 800) => new Promise((r) => setTimeout(r, ms));

// Mock auth service. Swap for real endpoints when the backend lands.
// Demo error triggers: log in with fail@klearnote.ai, sign up with taken@klearnote.ai.
export async function mockLogin(values: LoginValues) {
  await delay();
  if (values.email.toLowerCase() === "fail@klearnote.ai") {
    throw new Error("Invalid email or password.");
  }
  return { ok: true as const };
}

export async function mockOAuth(_provider: "google") {
  await delay(600);
  return { ok: true as const };
}

export async function mockSignup(values: SignupValues) {
  await delay();
  if (values.email.toLowerCase() === "taken@klearnote.ai") {
    throw new Error("That email is already registered.");
  }
  return { ok: true as const };
}

export async function mockRequestReset(_values: ForgotValues) {
  await delay();
  return { ok: true as const };
}

export async function mockResetPassword(_values: ResetValues) {
  await delay();
  return { ok: true as const };
}
