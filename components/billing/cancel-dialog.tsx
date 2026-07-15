"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { formatDate } from "@/lib/format";
import { useCancelSubscription } from "@/lib/hooks/queries";
import type { Plan, Subscription } from "@/lib/types";

/**
 * Cancelling is a *scheduled* action — the user keeps the period they've paid
 * for, which is what the pricing FAQ promises ("cancel anytime"). Reversible from
 * the plan card, so this needs a confirm step but not the typed-email friction of
 * the account danger zone.
 */
export function CancelDialog({
  subscription,
  plan,
}: {
  subscription: Subscription;
  plan: Plan;
}) {
  const [open, setOpen] = React.useState(false);
  const cancel = useCancelSubscription();
  const endsOn = formatDate(subscription.renewsAt);

  async function handleCancel() {
    try {
      await cancel.mutateAsync();
      setOpen(false);
      toast.success(`Your ${plan.name} plan will end on ${endsOn}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't cancel your subscription.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground">
          Cancel subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel your {plan.name} plan?</DialogTitle>
          <DialogDescription>
            You keep {plan.name} — and every feature on it — until{" "}
            <span className="text-foreground font-medium">{endsOn}</span>, the end
            of the period you&apos;ve already paid for. We won&apos;t charge you
            again.
          </DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground space-y-2 text-sm">
          <p>
            After that your projects, stems and masters stay in your library —
            you just won&apos;t be able to process new tracks until you subscribe
            again.
          </p>
          <p>You can resume any time before {endsOn} and nothing changes.</p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep my plan</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancel.isPending}
          >
            {cancel.isPending && <Loader2 className="animate-spin" />}
            Cancel subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
