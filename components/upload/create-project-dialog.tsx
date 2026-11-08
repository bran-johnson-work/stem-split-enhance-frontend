"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NAME_MAX = 255;

/**
 * Collects a project name and creates the project before any audio is uploaded
 * (the "create project first, then add files" flow). The parent owns the actual
 * API call via `onCreate`; this dialog just gathers the name and reflects the
 * pending/error state.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<void>;
  isPending?: boolean;
}) {
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Reset the field each time the dialog opens.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onCreate(name.trim());
      // Parent closes the dialog on success (it swaps in the uploader).
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't create the project.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Name your project, then add the audio files you want to separate
              into stems.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              autoFocus
              maxLength={NAME_MAX}
              placeholder="e.g. Midnight Drive — Master"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
