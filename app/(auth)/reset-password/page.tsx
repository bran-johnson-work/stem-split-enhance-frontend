import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthHeader
        title="Set a new password"
        subtitle="Choose a strong password you don't use elsewhere."
      />
      {/* ResetPasswordForm reads the token via useSearchParams(), which the App
          Router requires be wrapped in a Suspense boundary. */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
