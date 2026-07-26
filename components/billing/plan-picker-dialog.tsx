"use client";

import * as React from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  annualSavings,
  findPlan,
  monthlyEquivalent,
  planChange,
  priceFor,
  sortPlans,
  topAnnualDiscount,
  uploadsLabel,
} from "@/lib/billing/plans";
import { USE_REAL_BACKEND } from "@/lib/config";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  useChangePlan,
  usePaymentMethod,
  useStartCheckout,
} from "@/lib/hooks/queries";
import type { BillingCycle, Plan, PlanId, Subscription } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlanPickerDialog({
  open,
  onOpenChange,
  plans,
  subscription,
  initialPlanId,
  initialCycle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  subscription: Subscription;
  /** Preselected on open — set by the `/billing?plan=pro` deep link from pricing. */
  initialPlanId?: PlanId;
  /** Preselected billing cycle — the `&cycle=annual` the pricing toggle carried. */
  initialCycle?: BillingCycle;
}) {
  const changePlan = useChangePlan();
  const startCheckout = useStartCheckout();
  const { data: paymentMethod } = usePaymentMethod();

  const [selectedId, setSelectedId] = React.useState<PlanId>(
    initialPlanId ?? subscription.planId,
  );
  const [cycle, setCycle] = React.useState<BillingCycle>(
    initialCycle ?? subscription.cycle,
  );

  // Re-seed each time it opens, so a dismissed picker doesn't remember a
  // selection the user walked away from. Adjusted during render rather than in
  // an effect (the React-endorsed "state derived from a prop change" pattern) —
  // an effect would render the stale selection first, then flip it.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelectedId(initialPlanId ?? subscription.planId);
      setCycle(initialCycle ?? subscription.cycle);
    }
  }

  const ordered = React.useMemo(() => sortPlans(plans), [plans]);
  const selected = findPlan(plans, selectedId);
  const change = planChange(subscription, { planId: selectedId, cycle });
  const discount = topAnnualDiscount(plans);

  // Against the real backend the card is collected on Stripe's Checkout page, so
  // there's no in-app card to gate on. In mock mode a paid plan still needs one.
  const needsCard = Boolean(
    !USE_REAL_BACKEND && selected && selected.priceMonthly > 0 && !paymentMethod,
  );
  const pending = changePlan.isPending || startCheckout.isPending;
  const canConfirm = change !== "none" && !needsCard && !pending;

  async function handleConfirm() {
    if (!selected || !canConfirm) return;

    // Real backend: subscribing to a paid plan is a Stripe Checkout redirect —
    // Stripe takes the card, charges the first invoice, and creates the
    // subscription; our webhook syncs it on return. (Free is the mock path.)
    if (USE_REAL_BACKEND && selected.priceMonthly > 0) {
      try {
        const { url } = await startCheckout.mutateAsync({ planId: selectedId, cycle });
        // Leave the dialog open — we're navigating away to Stripe.
        window.location.href = url;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't start checkout.",
        );
      }
      return;
    }

    try {
      await changePlan.mutateAsync({ planId: selectedId, cycle });
      onOpenChange(false);
      toast.success(
        change === "upgrade"
          ? `You're on ${selected.name} — enjoy.`
          : `You'll switch to ${selected.name} on ${formatDate(subscription.renewsAt)}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't change your plan.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change your plan</DialogTitle>
          <DialogDescription>
            Upgrades start immediately and we prorate what you&apos;ve already
            paid. Downgrades take effect at the end of your billing period.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-3 py-5">
          <Label htmlFor="picker-cycle" className="text-sm">
            Monthly
          </Label>
          <Switch
            id="picker-cycle"
            checked={cycle === "annual"}
            onCheckedChange={(on) => setCycle(on ? "annual" : "monthly")}
          />
          <Label htmlFor="picker-cycle" className="text-sm">
            Annual
          </Label>
          {discount > 0 && (
            <Badge variant="secondary" className="text-brand">
              Save ~{discount}%
            </Badge>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Plan"
          className="grid gap-3 sm:grid-cols-2"
        >
          {ordered.map((plan) => (
            <PlanOption
              key={plan.id}
              plan={plan}
              cycle={cycle}
              selected={plan.id === selectedId}
              current={plan.id === subscription.planId}
              onSelect={() => setSelectedId(plan.id)}
            />
          ))}
        </div>

        {needsCard && (
          <p className="text-mastering mt-5 flex items-center gap-2 text-sm">
            <CreditCard className="size-4 shrink-0" aria-hidden />
            Add a payment method below before switching to a paid plan.
          </p>
        )}

        <DialogFooter className="mt-6 sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm sm:mr-auto">
            {selected && change !== "none" ? (
              change === "upgrade" ? (
                <>
                  Billed {formatCurrency(priceFor(selected, cycle))} today,
                  prorated.
                </>
              ) : (
                <>Starts on {formatDate(subscription.renewsAt)}. No charge now.</>
              )
            ) : (
              "This is your current plan."
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              {pending && <Loader2 className="animate-spin" />}
              {change === "downgrade" ? "Schedule change" : "Confirm upgrade"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanOption({
  plan,
  cycle,
  selected,
  current,
  onSelect,
}: {
  plan: Plan;
  cycle: BillingCycle;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  const isFree = plan.priceMonthly === 0;
  const savings = annualSavings(plan);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors",
        "hover:bg-muted/40 focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        selected && "border-brand ring-brand/30 bg-brand/5 ring-1",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="font-medium">{plan.name}</span>
        {current ? (
          <Badge variant="secondary">Current</Badge>
        ) : (
          selected && <Check className="text-brand size-4" aria-hidden />
        )}
      </div>

      <div className="flex items-baseline gap-1">
        {isFree ? (
          <span className="text-2xl font-semibold">Free</span>
        ) : (
          <>
            <span className="text-2xl font-semibold">
              {formatCurrency(monthlyEquivalent(plan, cycle))}
            </span>
            <span className="text-muted-foreground text-xs">/mo</span>
          </>
        )}
      </div>

      <span className="text-muted-foreground h-4 text-xs">
        {!isFree && cycle === "annual" && (
          <>
            {formatCurrency(plan.priceAnnual)}/yr
            {savings > 0 && ` · save ${formatCurrency(savings)}`}
          </>
        )}
      </span>

      <span className="mt-1 text-sm">{uploadsLabel(plan.uploadsPerMonth)}</span>
    </button>
  );
}
