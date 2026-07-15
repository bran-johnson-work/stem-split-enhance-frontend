"use client";

import { subscriptionAlert } from "@/lib/billing/entitlements";
import type { SubscriptionAlert } from "@/lib/billing/entitlements";
import { useSubscription } from "@/lib/hooks/queries";

/** The app-wide subscription banner (if any). `null` while loading or healthy. */
export function useSubscriptionAlert(): SubscriptionAlert | null {
  const { data: sub } = useSubscription();
  return sub ? subscriptionAlert(sub) : null;
}
