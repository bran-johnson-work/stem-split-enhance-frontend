import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Log in" };

// `?expired=1` is set by whichever guard noticed the dead session — the proxy
// (a provably expired `exp`) or the central 401 handler (lib/auth/session).
// Read here, in the server component, so the form isn't de-opted to CSR.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;

  return (
    <div className="space-y-6">
      <AuthHeader
        title="Welcome back"
        subtitle="Log in to your KlearNote account."
      />
      {expired === "1" && (
        <Alert>
          <AlertDescription>
            Your session expired. Log in again to pick up where you left off.
          </AlertDescription>
        </Alert>
      )}
      <LoginForm />
      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-brand hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
