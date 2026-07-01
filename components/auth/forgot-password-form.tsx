"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { mockRequestReset } from "@/lib/auth/mock-auth";
import { forgotSchema, type ForgotValues } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotValues) {
    await mockRequestReset(values);
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-completed/15 text-completed mx-auto grid size-12 place-items-center rounded-full">
          <MailCheck className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Check your inbox</p>
          <p className="text-muted-foreground text-sm">
            We sent a reset link to {sentTo}.
          </p>
        </div>
        <Button variant="outline" className="w-full" asChild>
          {/* Demo: jump straight to the reset screen */}
          <Link href="/reset-password">Open reset link</Link>
        </Button>
      </div>
    );
  }

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  autoFocus
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
    </Form>
  );
}
