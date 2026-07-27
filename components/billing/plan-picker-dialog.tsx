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
  type PlanChange,
  planChange,
  priceFor,
  sortPlans,
  topAnnualDiscount,
  uploadsLabel,
} from "@/lib/billing/plans";
import { USE_REAL_BACKEND } from "@/lib/config";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  useCancelSubscription,
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
  const cancel = useCancelSubscription();
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
  const pending = changePlan.isPending || startCheckout.isPending || cancel.isPending;
  const canConfirm = change !== "none" && !needsCard && !pending;

  // Which transport a confirmation uses against the real backend. Moving *to* the
  // free plan is a cancellation (no Stripe price to swap to); a user with no paid
  // subscription yet must go through Checkout to enter a card; everyone else swaps
  // their existing subscription's price in place.
  const currentlyPaid = subscription.planId !== "free";
  const selectingFree = Boolean(selected && selected.priceMonthly === 0);
  const isNewSubscription = USE_REAL_BACKEND && !currentlyPaid && !selectingFree;

  async function handleConfirm() {
    if (!selected || !canConfirm) return;

    if (USE_REAL_BACKEND) {
      // Downgrade to Free = cancel at period end; the paid plan runs to term.
      if (selectingFree) {
        try {
          await cancel.mutateAsync();
          onOpenChange(false);
          toast.success(
            `You'll move to Free on ${formatDate(subscription.renewsAt)}. You keep everything until then.`,
          );
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Couldn't schedule the change.",
          );
        }
        return;
      }

      // No paid subscription yet → Stripe Checkout takes the card, charges the
      // first invoice, and creates the subscription; our webhook syncs on return.
      if (isNewSubscription) {
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

      // Existing paid subscription → swap the plan/cadence in place (prorated).
      try {
        await changePlan.mutateAsync({ planId: selectedId, cycle });
        onOpenChange(false);
        toast.success(
          change === "upgrade"
            ? `You're on ${selected.name} — enjoy.`
            : `You've switched to ${selected.name}.`,
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't change your plan.",
        );
      }
      return;
    }

    // Mock backend: changePlan applies the whole thing synchronously.
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
            {USE_REAL_BACKEND ? (
              <>
                Changes apply right away and we prorate the difference — an
                upgrade is billed now, a downgrade is credited to your next
                invoice. Switching to Free keeps your plan until the period ends.
              </>
            ) : (
              <>
                Upgrades start immediately and we prorate what you&apos;ve
                already paid. Downgrades take effect at the end of your billing
                period.
              </>
            )}
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
            <ChangeSummary
              selected={selected}
              change={change}
              cycle={cycle}
              renewsAt={subscription.renewsAt}
              selectingFree={selectingFree}
              isNewSubscription={isNewSubscription}
            />
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              {pending && <Loader2 className="animate-spin" />}
              <ConfirmLabel
                change={change}
                selectingFree={selectingFree}
                isNewSubscription={isNewSubscription}
              />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The one-line "what happens when you confirm" note under the plan grid. */
function ChangeSummary({
  selected,
  change,
  cycle,
  renewsAt,
  selectingFree,
  isNewSubscription,
}: {
  selected: Plan | undefined;
  change: PlanChange;
  cycle: BillingCycle;
  renewsAt: string;
  selectingFree: boolean;
  isNewSubscription: boolean;
}) {
  if (!selected || change === "none") return <>This is your current plan.</>;

  if (USE_REAL_BACKEND) {
    if (selectingFree) {
      return <>Your plan runs until {formatDate(renewsAt)}, then moves to Free.</>;
    }
    if (isNewSubscription) {
      return (
        <>
          You&apos;ll enter your card on Stripe&apos;s secure checkout —{" "}
          {formatCurrency(priceFor(selected, cycle))} to start.
        </>
      );
    }
    return change === "upgrade" ? (
      <>Billed the prorated difference today.</>
    ) : (
      <>Applies now — we credit the difference to your next invoice.</>
    );
  }

  return change === "upgrade" ? (
    <>Billed {formatCurrency(priceFor(selected, cycle))} today, prorated.</>
  ) : (
    <>Starts on {formatDate(renewsAt)}. No charge now.</>
  );
}

/** The confirm button's label, which mirrors the action the confirm will take. */
function ConfirmLabel({
  change,
  selectingFree,
  isNewSubscription,
}: {
  change: PlanChange;
  selectingFree: boolean;
  isNewSubscription: boolean;
}) {
  if (USE_REAL_BACKEND) {
    if (selectingFree) return <>Switch to Free</>;
    if (isNewSubscription) return <>Continue to checkout</>;
    return change === "downgrade" ? <>Confirm change</> : <>Confirm upgrade</>;
  }
  return change === "downgrade" ? <>Schedule change</> : <>Confirm upgrade</>;
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
