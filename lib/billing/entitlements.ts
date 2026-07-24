// What a subscription lets a user *do* — the enforcement side of billing.
//
// Day 4 (KN-46) *shows* subscription status and monthly usage; Day 5 (KN-47)
// *enforces* them. These are pure functions over the `Subscription` + `Plan`
// fixtures (no React, no fetching), mirroring `lib/billing/plans.ts`, so the
// same rules drive the app-wide banner, the upload gate, and any future surface
// without drifting apart. Presentation (icons, colors) is left to the view — we
// return a semantic `kind`/`tone`, not JSX.

import { formatDate } from "@/lib/format";
import type { Plan, Subscription } from "@/lib/types";

export type AlertTone = "info" | "warning" | "danger";

/** The attention-worthy subscription states, surfaced app-wide. */
export interface SubscriptionAlert {
  /** Stable state key — drives icon choice in the banner. */
  kind: "trialing" | "ending" | "past_due" | "canceled";
  tone: AlertTone;
  title: string;
  body: string;
  cta: { label: string; href: string };
}

const MANAGE = { label: "Manage plan", href: "/billing" };

/**
 * The one banner (if any) a subscription should raise across the whole app.
 * Returns `null` for a healthy, active subscription — the common case.
 *
 * A scheduled *downgrade* (`scheduledChange`) is intentionally not surfaced
 * here: it's benign, already explained on the billing card, and needs no action.
 */
export function subscriptionAlert(sub: Subscription): SubscriptionAlert | null {
  if (sub.status === "past_due") {
    return {
      kind: "past_due",
      tone: "danger",
      title: "Your last payment didn't go through",
      body: "Update your payment method to keep processing tracks.",
      cta: { label: "Update payment", href: "/billing" },
    };
  }

  if (sub.status === "canceled") {
    return {
      kind: "canceled",
      tone: "danger",
      title: "Your subscription is canceled",
      body: "Your projects stay put, but you'll need an active plan to process new tracks.",
      cta: { label: "Reactivate plan", href: "/billing" },
    };
  }

  // Cancelled but still within the paid period — a gentle heads-up, not urgent.
  if (sub.cancelAtPeriodEnd) {
    return {
      kind: "ending",
      tone: "warning",
      title: `Your plan ends on ${formatDate(sub.renewsAt)}`,
      body: "You keep every feature until then. Resume any time to stay subscribed.",
      cta: MANAGE,
    };
  }

  if (sub.status === "trialing") {
    return {
      kind: "trialing",
      tone: "info",
      title: sub.trialEndsAt
        ? `Your trial ends on ${formatDate(sub.trialEndsAt)}`
        : "You're on the free trial",
      body: "Upgrade to unlock more monthly uploads and keep your work flowing.",
      cta: { label: "Upgrade", href: "/billing" },
    };
  }

  return null;
}

/** Whether the user may start a new upload, and why not if they can't. */
export type UploadGate =
  | { allowed: true }
  | {
      allowed: false;
      reason: "past_due" | "canceled" | "limit";
      title: string;
      body: string;
      cta: { label: string; href: string };
    };

/**
 * Can this user process another track? Blocked when the subscription can't pay
 * (`past_due`/`canceled`) or when they've spent this month's upload allowance.
 *
 * A pending cancellation (`cancelAtPeriodEnd`, status still `active`) does *not*
 * block — the billing card promises every feature stays until the period ends.
 */
export function uploadGate(
  sub: Subscription,
  plan: Plan,
  usedThisMonth: number,
): UploadGate {
  if (sub.status === "past_due") {
    return {
      allowed: false,
      reason: "past_due",
      title: "Uploads are paused",
      body: "We couldn't take your last payment. Update your payment method to process new tracks.",
      cta: { label: "Update payment", href: "/billing" },
    };
  }

  if (sub.status === "canceled") {
    return {
      allowed: false,
      reason: "canceled",
      title: "Your subscription is canceled",
      body: "Reactivate a plan to process new tracks — your existing projects are unaffected.",
      cta: { label: "Reactivate plan", href: "/billing" },
    };
  }

  if (plan.uploadsPerMonth !== "unlimited" && usedThisMonth >= plan.uploadsPerMonth) {
    return {
      allowed: false,
      reason: "limit",
      title: "You've hit this month's upload limit",
      body: `You've uploaded all ${plan.uploadsPerMonth} audio files on ${plan.name} this month. Upgrade for more, or come back next month.`,
      cta: { label: "Upgrade plan", href: "/billing" },
    };
  }

  return { allowed: true };
}
