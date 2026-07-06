"use client";

// Two-in-one email-verification surface, driven by query params:
//   • ?token=…            → confirm the address (from the emailed link), or
//   • ?email=…[&unverified=1] → "check your inbox", with a resend button.
// Backed by lib/api/auth (real endpoints, or a mock no-op with no backend).

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, MailCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  confirmEmailVerification,
  requestEmailVerification,
} from "@/lib/api/auth";
import { Button } from "@/components/ui/button";

type ConfirmState = "confirming" | "confirmed" | "error";

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email") ?? "";

  if (token) return <ConfirmToken token={token} />;
  return <ResendPrompt email={email} />;
}

/** Confirms the token from the verification link on mount. */
function ConfirmToken({ token }: { token: string }) {
  const [state, setState] = React.useState<ConfirmState>("confirming");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    confirmEmailVerification(token)
      .then(() => active && setState("confirmed"))
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Invalid or expired verification token.",
        );
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (state === "confirming") {
    return (
      <div className="space-y-4 text-center">
        <Loader2 className="text-brand mx-auto size-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Verifying your email…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-failed/15 text-failed mx-auto grid size-12 place-items-center rounded-full">
          <TriangleAlert className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Verification failed</p>
          <p className="text-muted-foreground text-sm">
            {error ?? "That link is invalid or has expired."}
          </p>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/verify-email">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="bg-completed/15 text-completed mx-auto grid size-12 place-items-center rounded-full">
        <MailCheck className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Email verified</p>
        <p className="text-muted-foreground text-sm">
          Your account is ready. You can log in now.
        </p>
      </div>
      <Button className="w-full" asChild>
        <Link href="/login">Continue to log in</Link>
      </Button>
    </div>
  );
}

/** "Check your inbox" with a resend action. */
function ResendPrompt({ email }: { email: string }) {
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function resend() {
    if (!email) {
      toast.error("Enter your email on the login page to resend.");
      return;
    }
    setSending(true);
    try {
      await requestEmailVerification(email);
      setSent(true);
      toast.success("Verification email sent.");
    } catch {
      // The endpoint is deliberately generic; surface a neutral confirmation.
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5 text-center">
      <div className="bg-brand/10 text-brand mx-auto grid size-12 place-items-center rounded-full">
        <MailCheck className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Verify your email</p>
        <p className="text-muted-foreground text-sm">
          {email ? (
            <>
              We sent a verification link to{" "}
              <span className="text-foreground font-medium">{email}</span>. Click
              it to activate your account.
            </>
          ) : (
            "Check your inbox for a verification link to activate your account."
          )}
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={resend}
        disabled={sending || sent}
      >
        {sending && <Loader2 className="size-4 animate-spin" />}
        {sent ? "Email sent" : "Resend verification email"}
      </Button>
      <p className="text-muted-foreground text-sm">
        Already verified?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
