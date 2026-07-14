// Plan arithmetic, shared by the marketing pricing cards and the billing screen.
// Pure functions over the `Plan` fixtures — no React, no fetching.

import type { BillingCycle, Plan, PlanId } from "@/lib/types";

/** Cheapest → most expensive. Also the order plans are listed in. */
export const PLAN_ORDER: PlanId[] = ["free", "creator", "pro", "studio"];

export const MONTHS_PER_YEAR = 12;

export function planRank(id: PlanId): number {
  return PLAN_ORDER.indexOf(id);
}

/** What the user is actually charged for one billing period. */
export function priceFor(plan: Plan, cycle: BillingCycle): number {
  return cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
}

/** Headline figure on a plan card — annual is shown as its effective monthly rate. */
export function monthlyEquivalent(plan: Plan, cycle: BillingCycle): number {
  return cycle === "annual"
    ? Math.round(plan.priceAnnual / MONTHS_PER_YEAR)
    : plan.priceMonthly;
}

/** Dollars saved per year by paying annually. `0` for free plans. */
export function annualSavings(plan: Plan): number {
  return Math.max(0, plan.priceMonthly * MONTHS_PER_YEAR - plan.priceAnnual);
}

/** Largest annual discount across the paid plans, e.g. 17 for "Save ~17%". */
export function topAnnualDiscount(plans: Plan[]): number {
  return plans.reduce((max, p) => {
    if (p.priceMonthly <= 0) return max;
    const full = p.priceMonthly * MONTHS_PER_YEAR;
    return Math.max(max, Math.round(((full - p.priceAnnual) / full) * 100));
  }, 0);
}

export function uploadsLabel(uploads: Plan["uploadsPerMonth"]): string {
  return uploads === "unlimited"
    ? "Unlimited uploads"
    : `${uploads} uploads / mo`;
}

/**
 * How much a (plan, cycle) pair is worth relative to another. Folding the cycle
 * into the rank means switching monthly → annual on the same plan counts as an
 * upgrade (it bills now) while annual → monthly counts as a downgrade (it waits
 * for the period to end) — the same rule the pricing FAQ states.
 */
function effectiveRank(planId: PlanId, cycle: BillingCycle): number {
  return planRank(planId) * 2 + (cycle === "annual" ? 1 : 0);
}

export type PlanChange = "upgrade" | "downgrade" | "none";

/**
 * Which way a plan switch goes. Upgrades bill immediately and are prorated;
 * downgrades are scheduled for the end of the current period.
 */
export function planChange(
  from: { planId: PlanId; cycle: BillingCycle },
  to: { planId: PlanId; cycle: BillingCycle },
): PlanChange {
  const a = effectiveRank(from.planId, from.cycle);
  const b = effectiveRank(to.planId, to.cycle);
  if (b > a) return "upgrade";
  if (b < a) return "downgrade";
  return "none";
}

export function findPlan(plans: Plan[] | undefined, id: PlanId): Plan | undefined {
  return plans?.find((p) => p.id === id);
}

/** Sort into `PLAN_ORDER`, so the picker never depends on fixture ordering. */
export function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => planRank(a.id) - planRank(b.id));
}
