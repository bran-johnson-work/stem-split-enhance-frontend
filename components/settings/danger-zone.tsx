"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";
import { useDeleteAccount } from "@/lib/hooks/queries";
import type { User } from "@/lib/types";

export function DangerZone({ user }: { user: User }) {
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const deleteAccount = useDeleteAccount();
  const { logout } = useAuth();
  const router = useRouter();

  // Typed confirmation: the account's own email, so the action can't be a
  // reflex click. Case-insensitive — this is a speed bump, not a spelling test.
  const confirmed =
    confirmation.trim().toLowerCase() === user.email.toLowerCase();

  async function handleDelete() {
    if (!confirmed) return;
    try {
      await deleteAccount.mutateAsync();
      // Clears the token cookie and the query cache. Its server-side revoke
      // call 401s on an account that no longer exists — logout already
      // swallows that, so it stays best-effort.
      await logout();
      toast.success("Your account has been deleted.");
      router.push("/login");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete your account.",
      );
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <TriangleAlert className="size-4" />
          Danger zone
        </CardTitle>
        <CardDescription>
          Deleting your account removes your projects, stems and masters. This
          cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setConfirmation("");
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">Delete account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                Every project, stem and master on this account is permanently
                deleted. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type <span className="font-medium">{user.email}</span> to
                confirm
              </Label>
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
                placeholder={user.email}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={!confirmed || deleteAccount.isPending}
                onClick={handleDelete}
              >
                {deleteAccount.isPending && <Loader2 className="animate-spin" />}
                Delete account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
