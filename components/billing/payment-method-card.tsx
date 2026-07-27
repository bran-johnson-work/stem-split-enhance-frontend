"use client";

import * as React from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CardDialog } from "@/components/billing/card-dialog";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemovePaymentMethod } from "@/lib/hooks/queries";
import type { PaymentMethod, Subscription } from "@/lib/types";
import { CARD_BRAND_LABEL } from "@/lib/validations/billing";

export function PaymentMethodCard({
  paymentMethod,
  subscription,
  isLoading,
  onManageBilling,
  managing,
}: {
  paymentMethod: PaymentMethod | null | undefined;
  subscription: Subscription;
  isLoading: boolean;
  /** Real backend: open the Stripe Customer Portal to manage the card. When set,
   *  the card is owned by Stripe and the in-app add/update/remove UI is hidden. */
  onManageBilling?: () => void;
  managing?: boolean;
}) {
  const [cardOpen, setCardOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);
  const removeMethod = useRemovePaymentMethod();

  // Real backend: cards are entered and managed on Stripe's own pages (Checkout
  // + Customer Portal), never stored or shown here.
  if (onManageBilling) {
    const onPaidPlan = subscription.planId !== "free";
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment method</CardTitle>
          <CardDescription>
            Your card is stored securely by Stripe. Manage it in the billing
            portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
              <CreditCard className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Managed by Stripe</p>
              <p className="text-muted-foreground max-w-xs text-sm">
                {onPaidPlan
                  ? "Update your card or download receipts in the secure portal. Change your plan right here on this page."
                  : "Subscribe to a paid plan to add a card — checkout opens on Stripe."}
              </p>
            </div>
            {onPaidPlan && (
              <Button onClick={onManageBilling} disabled={managing}>
                {managing && <Loader2 className="animate-spin" />}
                Manage in Stripe
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Removing the card that's paying for an active plan would break the next
  // renewal, so the confirm step says so out loud.
  const onPaidPlan = subscription.planId !== "free";

  async function handleRemove() {
    try {
      await removeMethod.mutateAsync();
      setRemoveOpen(false);
      toast.success("Payment method removed.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't remove that card.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment method</CardTitle>
        <CardDescription>
          The card we charge when your subscription renews.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : paymentMethod ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-md">
                <CreditCard className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="font-medium">
                  {CARD_BRAND_LABEL[paymentMethod.brand]} ending in{" "}
                  <span className="tabular-nums">{paymentMethod.last4}</span>
                </p>
                <p className="text-muted-foreground text-sm tabular-nums">
                  Expires {String(paymentMethod.expMonth).padStart(2, "0")}/
                  {String(paymentMethod.expYear).slice(-2)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCardOpen(true)}>
                Update
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setRemoveOpen(true)}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
              <CreditCard className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No payment method on file</p>
              <p className="text-muted-foreground max-w-xs text-sm">
                Add a card to subscribe to a paid plan.
              </p>
            </div>
            <Button onClick={() => setCardOpen(true)}>Add payment method</Button>
          </div>
        )}
      </CardContent>

      <CardDialog
        open={cardOpen}
        onOpenChange={setCardOpen}
        replacing={Boolean(paymentMethod)}
      />

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this card?</DialogTitle>
            <DialogDescription>
              {onPaidPlan
                ? "Without a card on file we can't renew your subscription, and it will lapse at the end of the current period."
                : "You'll need to add a card again before subscribing to a paid plan."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep card</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeMethod.isPending}
            >
              {removeMethod.isPending && <Loader2 className="animate-spin" />}
              Remove card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
