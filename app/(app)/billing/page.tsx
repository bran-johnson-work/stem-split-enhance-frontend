import { Suspense } from "react";
import { BillingView } from "@/components/billing/billing-view";

// BillingView reads `?plan=` (useSearchParams) for the deep link from the pricing
// page, which Next requires to sit inside a Suspense boundary for static rendering.
export default function BillingPage() {
  return (
    <Suspense>
      <BillingView />
    </Suspense>
  );
}
