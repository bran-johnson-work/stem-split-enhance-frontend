"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useChangePassword } from "@/lib/hooks/queries";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/validations/account";

const EMPTY: ChangePasswordValues = {
  currentPassword: "",
  password: "",
  confirm: "",
};

export function PasswordForm() {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  async function onSubmit(values: ChangePasswordValues) {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.password,
      });
      form.reset(EMPTY);
      toast.success("Password updated.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't update your password.";
      // A wrong current password belongs on the field, not just in a toast.
      if (message.toLowerCase().includes("current password")) {
        form.setError("currentPassword", { message });
        form.setFocus("currentPassword");
      }
      toast.error(message);
    }
  }

  const password = useWatch({ control: form.control, name: "password" });
  const { isSubmitting } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Use at least 8 characters, with an uppercase letter and a number.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="max-w-sm space-y-4"
          >
            <PasswordField
              control={form.control}
              name="currentPassword"
              label="Current password"
              autoComplete="current-password"
            />
            <div className="space-y-2">
              <PasswordField
                control={form.control}
                name="password"
                label="New password"
                autoComplete="new-password"
              />
              <PasswordStrength value={password} />
            </div>
            <PasswordField
              control={form.control}
              name="confirm"
              label="Confirm new password"
              autoComplete="new-password"
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Update password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
