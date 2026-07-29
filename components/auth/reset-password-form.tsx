"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { resetPassword } from "@/lib/api/auth";
import { USE_REAL_BACKEND } from "@/lib/config";
import { resetSchema, type ResetValues } from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  // The single-use token comes from the emailed link's `?token=` query param.
  const token = useSearchParams().get("token");
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });
  const { isSubmitting } = form.formState;

  // Against a real backend a token is required; without one the reset can't
  // succeed, so tell the user to request a fresh link rather than let them fill
  // in a password that will be rejected. (Mock mode has no token to check.)
  // Kept below the hooks so hook order stays stable across renders.
  if (USE_REAL_BACKEND && !token) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-medium">This reset link is invalid or has expired</p>
        <p className="text-muted-foreground text-sm">
          Request a new one and we&apos;ll email you a fresh link.
        </p>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(values: ResetValues) {
    try {
      await resetPassword(token ?? "", values.password);
    } catch (err) {
      // An expired/used token, or a rejected password, comes back here.
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't reset your password. Please try again.";
      toast.error(message);
      return;
    }
    toast.success("Password updated. You can log in now.");
    router.push("/login");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <PasswordField
            control={form.control}
            name="password"
            label="New password"
            autoComplete="new-password"
            autoFocus
          />
          <PasswordStrength value={password} />
        </div>
        <PasswordField
          control={form.control}
          name="confirm"
          label="Confirm password"
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </Form>
  );
}
