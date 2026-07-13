"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AvatarPicker } from "@/components/settings/avatar-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useUpdateProfile } from "@/lib/hooks/queries";
import type { User } from "@/lib/types";
import { profileSchema, type ProfileValues } from "@/lib/validations/account";

export function ProfileForm({ user }: { user: User }) {
  const updateProfile = useUpdateProfile();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, email: user.email },
  });

  async function onSubmit(values: ProfileValues) {
    const emailChanged =
      values.email.trim().toLowerCase() !== user.email.toLowerCase();
    try {
      await updateProfile.mutateAsync(values);
      // Re-baseline the form so it goes clean again (and a second save of the
      // same email isn't treated as another change).
      form.reset(values);
      toast.success(
        emailChanged
          ? "Profile saved. Check your new inbox to confirm the address."
          : "Profile saved.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save your profile.",
      );
    }
  }

  const { isSubmitting, isDirty } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your name and photo appear across KlearNote.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AvatarPicker user={user} />
        <Separator />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
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
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    If you change this, we&apos;ll email the new address to
                    verify it.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
