import type { Metadata } from "next";
import * as React from "react";
import { AuthHeader } from "@/components/auth/auth-header";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6">
      <AuthHeader
        title="Email verification"
        subtitle="One quick step to secure your account."
      />
      <React.Suspense fallback={null}>
        <VerifyEmailForm />
      </React.Suspense>
    </div>
  );
}
