"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";

/**
 * Post-Checkout landing. The subscription is written server-side by the Stripe
 * webhook, which may land a beat after the browser redirect — so we invalidate
 * the subscription/user/invoices caches (a refetch, not a guess) and bounce back
 * to /billing, where the fresh ACTIVE plan shows. If the webhook is a touch late
 * the plan updates on the next poll/refetch rather than here.
 */
export function CheckoutSuccess() {
  const router = useRouter();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.invoices() });
    // `User` embeds its subscription, so the sidebar/menu need the refresh too.
    queryClient.invalidateQueries({ queryKey: queryKeys.users.current() });
    toast.success("Payment received — your plan is being activated.");
    router.replace("/billing");
  }, [queryClient, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden />
      <p className="text-muted-foreground text-sm">Finalizing your subscription…</p>
    </div>
  );
}
