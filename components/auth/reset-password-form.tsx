"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { mockResetPassword } from "@/lib/auth/mock-auth";
import { resetSchema, type ResetValues } from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: ResetValues) {
    await mockResetPassword(values);
    toast.success("Password updated. You can log in now.");
    router.push("/login");
  }

  const password = useWatch({ control: form.control, name: "password" });
  const { isSubmitting } = form.formState;

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
