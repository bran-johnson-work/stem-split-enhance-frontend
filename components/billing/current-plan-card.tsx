"use client";

import { CalendarClock, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { CancelDialog } from "@/components/billing/cancel-dialog";
import { SubscriptionStatusBadge } from "@/components/billing/subscription-status-badge";
import { UsageMeter } from "@/components/billing/usage-meter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { findPlan, monthlyEquivalent, priceFor } from "@/lib/billing/plans";
import { formatCurrency, formatDate } from "@/lib/format";
import { useResumeSubscription } from "@/lib/hooks/queries";
import type { Plan, Subscription } from "@/lib/types";

export function CurrentPlanCard({
  subscription,
  plans,
  onChangePlan,
}: {
  subscription: Subscription;
  plans: Plan[];
  /** Opens the plan picker, which BillingView owns (the ?plan= deep link drives it too). */
  onChangePlan: () => void;
}) {
  const resume = useResumeSubscription();
  const plan = findPlan(plans, subscription.planId);

  if (!plan) return null;

  const isFree = plan.priceMonthly === 0;
  const price = priceFor(plan, subscription.cycle);
  const perYear = subscription.cycle === "annual";

  async function handleResume() {
    try {
      await resume.mutateAsync();
      toast.success("Your subscription continues as normal.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't update your subscription.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Current plan</CardTitle>
          <SubscriptionStatusBadge status={subscription.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold tracking-tight">
            {plan.name}
          </span>
          {isFree ? (
            <span className="text-muted-foreground text-sm">Free forever</span>
          ) : (
            <span className="text-muted-foreground text-sm">
              {formatCurrency(price)} / {perYear ? "year" : "month"}
              {perYear &&
                ` · ${formatCurrency(monthlyEquivalent(plan, "annual"))} a month`}
            </span>
          )}
        </div>

        <p className="text-muted-foreground text-sm">{plan.description}</p>

        <Separator />

        <UsageMeter plan={plan} />

        <Separator />

        <RenewalLine
          subscription={subscription}
          plans={plans}
          isFree={isFree}
          onResume={handleResume}
          resuming={resume.isPending}
        />
      </CardContent>

      <CardFooter className="flex flex-wrap gap-3">
        <Button onClick={onChangePlan}>
          {isFree ? "Upgrade plan" : "Change plan"}
        </Button>
        {!isFree && !subscription.cancelAtPeriodEnd && (
          <CancelDialog subscription={subscription} plan={plan} />
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * The one line that says what happens next. A scheduled cancellation and a
 * scheduled downgrade are both undone by `resumeSubscription`, so they share the
 * same affordance.
 */
function RenewalLine({
  subscription: sub,
  plans,
  isFree,
  onResume,
  resuming,
}: {
  subscription: Subscription;
  plans: Plan[];
  isFree: boolean;
  onResume: () => void;
  resuming: boolean;
}) {
  const renewsAt = formatDate(sub.renewsAt);

  if (sub.cancelAtPeriodEnd) {
    return (
      <Notice
        tone="warning"
        icon={TriangleAlert}
        title={`Your plan ends on ${renewsAt}`}
        body="You keep every feature until then. After that your projects stay put, but you won't be able to process new tracks."
        action={
          <Button variant="outline" size="sm" onClick={onResume} disabled={resuming}>
            {resuming && <Loader2 className="animate-spin" />}
            Resume subscription
          </Button>
        }
      />
    );
  }

  if (sub.scheduledChange) {
    const next = findPlan(plans, sub.scheduledChange.planId);
    return (
      <Notice
        tone="info"
        icon={CalendarClock}
        title={`Switching to ${next?.name ?? "a new plan"} on ${renewsAt}`}
        body={`You stay on your current plan — and pay nothing more — until then. The ${sub.scheduledChange.cycle} ${next?.name ?? ""} price applies from that date.`}
        action={
          <Button variant="outline" size="sm" onClick={onResume} disabled={resuming}>
            {resuming && <Loader2 className="animate-spin" />}
            Keep current plan
          </Button>
        }
      />
    );
  }

  if (sub.status === "past_due") {
    return (
      <Notice
        tone="warning"
        icon={TriangleAlert}
        title="We couldn't take your last payment"
        body="Update your payment method to keep processing tracks."
      />
    );
  }

  if (sub.status === "trialing" && sub.trialEndsAt) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <CalendarClock className="size-4 shrink-0" aria-hidden />
        Your trial ends on {formatDate(sub.trialEndsAt)}.
      </p>
    );
  }

  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <CalendarClock className="size-4 shrink-0" aria-hidden />
      {isFree ? (
        <>Upgrade any time — nothing to renew on the Trial plan.</>
      ) : (
        <>Renews automatically on {renewsAt}.</>
      )}
    </p>
  );
}

function Notice({
  tone,
  icon: Icon,
  title,
  body,
  action,
}: {
  tone: "info" | "warning";
  icon: typeof CalendarClock;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const toneClass =
    tone === "warning"
      ? "border-failed/40 bg-failed/5 text-failed"
      : "border-analyzing/40 bg-analyzing/5 text-analyzing";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-sm">{body}</p>
          {action && <div className="pt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
