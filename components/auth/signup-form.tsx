"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrength } from "@/components/auth/password-strength";
import { SocialButtons } from "@/components/auth/social-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { signupSchema, type SignupValues } from "@/lib/validations/auth";

export function SignupForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", terms: false },
  });

  async function onSubmit(values: SignupValues) {
    setFormError(null);
    try {
      const { needsVerification } = await register(values);
      if (needsVerification) {
        // Real backend: account is unverified — confirm email before logging in.
        toast.success("Account created — check your email to verify.");
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      toast.success("Account created — welcome to KlearNote!");
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setFormError(message);
      toast.error(message);
    }
  }

  const password = useWatch({ control: form.control, name: "password" });
  const { isSubmitting } = form.formState;

  return (
    <div className="space-y-4">
      <SocialButtons label="Sign up with Google" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    // autoFocus
                    placeholder="Alfie Martin"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <PasswordField
              control={form.control}
              name="password"
              label="Password"
              autoComplete="new-password"
            />
            <PasswordStrength value={password} />
          </div>
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className="flex items-start gap-2">
                  <FormControl>
                    <Checkbox
                      className="mt-0.5"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-muted-foreground block text-sm leading-snug font-normal">
                    I agree to the{" "}
                    <Link href="/terms" className="text-brand hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-brand hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Create account
          </Button>
        </form>
      </Form>
    </div>
  );
}
