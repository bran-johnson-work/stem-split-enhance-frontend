// Real billing calls against Dakota's API. Only invoices are wired here today:
// they are read live from Stripe (the system of record for receipts), so unlike
// plans/subscription there is no local copy to serve. The rest of the billing
// surface still runs on MockApi — see lib/api/http.ts.
//
// Real-only, like lib/api/jobs: the mock branch lives in MockApi and lib/api/index
// picks between the two. Callers go through the KlearNoteApi seam, not this module.

import { apiFetch } from "@/lib/api/fetch";
import { apiUrl } from "@/lib/config";
import type {
  BillingCycle,
  Invoice,
  Plan,
  PlanId,
  Subscription,
  SubscriptionStatus,
} from "@/lib/types";

/** Shape of the API's InvoiceResponse (amounts already in dollars). */
interface InvoiceResponse {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

/** The API normalises to these three; anything else is treated as open. */
function mapStatus(status: string): Invoice["status"] {
  if (status === "paid" || status === "open" || status === "failed") return status;
  return "open";
}

function mapInvoice(res: InvoiceResponse): Invoice {
  return {
    id: res.id,
    date: res.created_at,
    amount: res.amount,
    status: mapStatus(res.status),
    // The direct PDF is what "Download" should hand the user; the hosted receipt
    // page is the fallback for the rare invoice with no rendered PDF yet.
    url: res.invoice_pdf ?? res.hosted_invoice_url ?? "",
    description: res.description ?? undefined,
  };
}

/** The caller's invoices, newest first. Empty for a user with no billing history. */
export async function listInvoices(): Promise<Invoice[]> {
  const invoices = await apiFetch<InvoiceResponse[]>(apiUrl("/billing/invoices"));
  return invoices.map(mapInvoice);
}

// ---- Plans / subscription / checkout / portal (real Stripe) ---------------

/** The API's PlanResponse (see app/schemas/billing.py::PlanResponse). */
interface PlanResponse {
  id: string;
  name: string;
  display_name: string;
  price_monthly_cents: number;
  price_annual_cents: number;
  max_projects_per_month: number | null;
  max_files_per_month: number | null;
  max_file_size_mb: number;
  // features JSON is the seed's { description, bullets[], highlighted, ... }.
  features: {
    description?: string;
    bullets?: string[];
    highlighted?: boolean;
  } | null;
  is_active: boolean;
}

/** The API's SubscriptionResponse (see app/schemas/billing.py::SubscriptionResponse). */
interface SubscriptionResponse {
  has_subscription: boolean;
  status: string | null;
  plan: PlanResponse;
  // "monthly" | "annual" | null (null = free/unknown → default monthly).
  interval: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
}

/** The four seeded plan names map 1:1 onto the frontend PlanId union. */
function toPlanId(name: string): PlanId {
  return (["free", "creator", "pro", "studio"].includes(name) ? name : "free") as PlanId;
}

function mapPlan(res: PlanResponse): Plan {
  return {
    id: toPlanId(res.name),
    name: res.display_name,
    // The API speaks cents; the UI formats dollars everywhere else.
    priceMonthly: res.price_monthly_cents / 100,
    priceAnnual: res.price_annual_cents / 100,
    description: res.features?.description ?? "",
    features: res.features?.bullets ?? [],
    highlighted: res.features?.highlighted ?? undefined,
    // null = unlimited, matching the plan meter's "unlimited" sentinel.
    uploadsPerMonth: res.max_files_per_month === null ? "unlimited" : res.max_files_per_month,
  };
}

// Backend SubscriptionStatus -> the four the UI renders. Stripe's "incomplete*"
// (payment not finished) surfaces as needs-attention; a null status is a user
// with no subscription row, i.e. the free plan.
function mapSubStatus(status: string | null): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "incomplete":
    case "incomplete_expired":
      return "past_due";
    case "cancelled":
      return "canceled";
    default:
      return "active"; // no row => free plan, treated as active
  }
}

function mapSubscription(res: SubscriptionResponse): Subscription {
  // The API persists the purchased cadence; a null (free/legacy row) reads as monthly.
  const cycle: BillingCycle = res.interval === "annual" ? "annual" : "monthly";
  const status = mapSubStatus(res.status);
  return {
    planId: toPlanId(res.plan.name),
    status,
    cycle,
    renewsAt: res.current_period_end ?? "",
    trialEndsAt:
      status === "trialing" && res.current_period_end ? res.current_period_end : undefined,
    cancelAtPeriodEnd: res.cancel_at_period_end || undefined,
  };
}

/** Active plans for the pricing/billing screens. */
export async function getPlans(): Promise<Plan[]> {
  const plans = await apiFetch<PlanResponse[]>(apiUrl("/billing/plans"));
  return plans.map(mapPlan);
}

/** The caller's effective subscription (free-plan default when none exists). */
export async function getSubscription(): Promise<Subscription> {
  const res = await apiFetch<SubscriptionResponse>(apiUrl("/billing/subscription"));
  return mapSubscription(res);
}

/**
 * Start a Stripe Checkout Session for a *new* subscription. Returns the hosted
 * URL the browser must redirect to — the card is entered on Stripe's page, not
 * ours, and the subscription is created + charged there, then synced back via
 * the `customer.subscription.*` webhook.
 */
export async function createCheckout(
  planName: PlanId,
  interval: BillingCycle,
): Promise<string> {
  const res = await apiFetch<{ checkout_url: string }>(apiUrl("/billing/checkout"), {
    method: "POST",
    json: { plan_name: planName, interval },
  });
  return res.checkout_url;
}

/**
 * Open the Stripe Customer Portal (manage card, switch/cancel an existing paid
 * plan). 400s for a user with no billing account yet — subscribe via Checkout
 * first.
 */
export async function createPortalSession(): Promise<string> {
  const res = await apiFetch<{ portal_url: string }>(apiUrl("/billing/portal"), {
    method: "POST",
  });
  return res.portal_url;
}

/** Cancel at period end (keeps access until it lapses). Returns fresh state. */
export async function cancelSubscription(): Promise<Subscription> {
  const res = await apiFetch<SubscriptionResponse>(apiUrl("/billing/cancel"), {
    method: "POST",
    json: { immediate: false },
  });
  return mapSubscription(res);
}

/** Undo a scheduled cancellation (keep the subscription renewing). */
export async function resumeSubscription(): Promise<Subscription> {
  const res = await apiFetch<SubscriptionResponse>(apiUrl("/billing/resume"), {
    method: "POST",
  });
  return mapSubscription(res);
}
