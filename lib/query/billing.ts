"use client";

// Billing feature: option factories, read hooks, and the plan/payment mutations.
// Every subscription mutation lands the fresh subscription in the cache and then
// invalidates the current user — because `User` *embeds* its subscription, so
// the sidebar and user menu would otherwise keep showing the old plan — plus
// invoices, since an upgrade bills immediately (KN-46). Payment-method mutations
// seed their cache directly.

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { CardToken, ChangePlanInput, Subscription } from "@/lib/types";

export const billingQueries = {
  plans: () =>
    queryOptions({
      queryKey: queryKeys.billing.plans(),
      queryFn: () => api.getPlans(),
    }),
  subscription: () =>
    queryOptions({
      queryKey: queryKeys.billing.subscription(),
      queryFn: () => api.getSubscription(),
    }),
  invoices: () =>
    queryOptions({
      queryKey: queryKeys.billing.invoices(),
      queryFn: () => api.listInvoices(),
    }),
  paymentMethod: () =>
    queryOptions({
      queryKey: queryKeys.billing.paymentMethod(),
      queryFn: () => api.getPaymentMethod(),
    }),
};

export function usePlans() {
  return useQuery(billingQueries.plans());
}

export function useSubscription() {
  return useQuery(billingQueries.subscription());
}

export function useInvoices() {
  return useQuery(billingQueries.invoices());
}

export function usePaymentMethod() {
  return useQuery(billingQueries.paymentMethod());
}

/** Seed the fresh subscription, then invalidate the user + invoices it affects. */
function applySubscription(queryClient: QueryClient, subscription: Subscription) {
  queryClient.setQueryData(queryKeys.billing.subscription(), subscription);
  queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
  queryClient.invalidateQueries({ queryKey: queryKeys.billing.invoices() });
}

function useSubscriptionMutation<TInput = void>(
  mutationFn: (input: TInput) => Promise<Subscription>,
) {
  const queryClient = useQueryClient();
  return useMutation<Subscription, Error, TInput>({
    mutationFn,
    onSuccess: (subscription) => applySubscription(queryClient, subscription),
  });
}

export function useChangePlan() {
  return useSubscriptionMutation((input: ChangePlanInput) =>
    api.changePlan(input),
  );
}

/**
 * Start a real Stripe Checkout (new subscription) and hand back the hosted URL.
 * The caller redirects the browser there; the subscription is created + charged
 * on Stripe and synced back by webhook, so there is nothing to cache here.
 */
export function useStartCheckout() {
  return useMutation<{ url: string }, Error, ChangePlanInput>({
    mutationFn: (input) => api.startCheckout(input),
  });
}

/** Open the Stripe Customer Portal (manage card / change an existing plan). */
export function useBillingPortal() {
  return useMutation<{ url: string }, Error, void>({
    mutationFn: () => api.openBillingPortal(),
  });
}

export function useCancelSubscription() {
  return useSubscriptionMutation<void>(() => api.cancelSubscription());
}

/** Undoes a scheduled cancellation *or* a scheduled downgrade. */
export function useResumeSubscription() {
  return useSubscriptionMutation<void>(() => api.resumeSubscription());
}

export function useSavePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: CardToken) => api.attachPaymentMethod(token),
    onSuccess: (method) =>
      queryClient.setQueryData(queryKeys.billing.paymentMethod(), method),
  });
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.removePaymentMethod(),
    onSuccess: () =>
      queryClient.setQueryData(queryKeys.billing.paymentMethod(), null),
  });
}
