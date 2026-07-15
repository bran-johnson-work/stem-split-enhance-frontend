"use client";

import { uploadGate } from "@/lib/billing/entitlements";
import type { UploadGate } from "@/lib/billing/entitlements";
import { findPlan } from "@/lib/billing/plans";
import { usePlans, useSubscription } from "@/lib/hooks/queries";
import { useMonthlyUsage } from "@/lib/hooks/use-monthly-usage";

export interface UploadGateState {
  gate: UploadGate;
  isLoading: boolean;
}

/**
 * Whether the current user may start an upload. Composes the subscription, the
 * active plan and this month's usage into the pure `uploadGate` rule.
 *
 * Fails open: while any input is loading or missing we allow the upload rather
 * than block behind a spinner — the mock `createProject` (and the real backend)
 * enforce the cap server-side as the backstop.
 */
export function useUploadGate(): UploadGateState {
  const { data: sub, isLoading: subLoading } = useSubscription();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { used, isLoading: usageLoading } = useMonthlyUsage();

  const isLoading = subLoading || plansLoading || usageLoading;
  const plan = sub && plans ? findPlan(plans, sub.planId) : undefined;

  const gate: UploadGate =
    sub && plan ? uploadGate(sub, plan, used) : { allowed: true };

  return { gate, isLoading };
}
