import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <AuthHeader
        title="Create your account"
        subtitle="Start separating and mastering tracks for free."
      />
      <SignupForm />
      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
