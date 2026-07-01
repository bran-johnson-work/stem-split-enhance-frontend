import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthHeader
        title="Reset your password"
        subtitle="Enter your email and we'll send you a reset link."
      />
      <ForgotPasswordForm />
      <p className="text-muted-foreground text-center text-sm">
        Remembered it?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
