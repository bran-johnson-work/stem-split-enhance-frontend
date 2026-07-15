"use client";

import * as React from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_IMAGE_LABEL,
  AVATAR_ACCEPT_ATTR,
  MAX_AVATAR_BYTES,
  avatarStore,
  validateAvatarFile,
} from "@/lib/avatar/avatar-store";
import { formatBytes, initials } from "@/lib/format";
import { useUpdateProfile } from "@/lib/hooks/queries";
import type { User } from "@/lib/types";

/**
 * The avatar saves on pick/remove rather than joining the profile form's dirty
 * state — the image is written through the AvatarStore seam the moment it's
 * chosen, so deferring the profile update until "Save changes" would leave the
 * two out of sync if the user never pressed it.
 */
export function AvatarPicker({ user }: { user: User }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<"upload" | "remove" | null>(null);
  const updateProfile = useUpdateProfile();

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be picked again after an error / removal.
    event.target.value = "";
    if (!file) return;

    const check = validateAvatarFile(file);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setError(null);
    setPending("upload");
    try {
      const avatarUrl = await avatarStore.upload(file);
      await updateProfile.mutateAsync({ avatarUrl });
      toast.success("Photo updated.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't update your photo.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  async function handleRemove() {
    setError(null);
    setPending("remove");
    try {
      await avatarStore.remove();
      await updateProfile.mutateAsync({ avatarUrl: null });
      toast.success("Photo removed.");
    } catch {
      toast.error("Couldn't remove your photo.");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Avatar className="size-16">
        <AvatarImage src={user.avatarUrl} alt="" />
        <AvatarFallback className="bg-brand text-primary-foreground text-lg">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT_ATTR}
            onChange={handleFile}
            className="sr-only"
            aria-label="Upload a profile photo"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {pending === "upload" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Upload />
            )}
            Upload photo
          </Button>
          {user.avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={handleRemove}
            >
              {pending === "remove" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              Remove
            </Button>
          )}
        </div>
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            {ACCEPTED_IMAGE_LABEL}, up to {formatBytes(MAX_AVATAR_BYTES)}.
          </p>
        )}
      </div>
    </div>
  );
}
