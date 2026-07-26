import { Suspense } from "react";
import { CheckoutSuccess } from "@/components/billing/checkout-success";

// Stripe redirects here after a completed Checkout (the backend's
// checkout_success_url = {FRONTEND_URL}/billing/success). The subscription is
// created server-side by webhook, so this page just refreshes the cached state
// and sends the user back to billing. Suspense: CheckoutSuccess uses client hooks.
export default function BillingSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccess />
    </Suspense>
  );
}
