"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CurrentPlanCard } from "@/components/billing/current-plan-card";
import { InvoicesCard } from "@/components/billing/invoices-card";
import { PaymentMethodCard } from "@/components/billing/payment-method-card";
import { PlanPickerDialog } from "@/components/billing/plan-picker-dialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_ORDER } from "@/lib/billing/plans";
import { USE_REAL_BACKEND } from "@/lib/config";
import {
  useBillingPortal,
  usePaymentMethod,
  usePlans,
  useSubscription,
} from "@/lib/hooks/queries";
import type { BillingCycle, PlanId } from "@/lib/types";

/** `?plan=pro` — only if it names a plan we actually have. */
function readPlanParam(value: string | null): PlanId | undefined {
  return PLAN_ORDER.includes(value as PlanId) ? (value as PlanId) : undefined;
}

/** `?cycle=annual` — carried from the pricing page toggle. */
function readCycleParam(value: string | null): BillingCycle | undefined {
  return value === "annual" || value === "monthly" ? value : undefined;
}

export function BillingView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: subscription, isLoading: subLoading, isError } = useSubscription();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: paymentMethod, isLoading: pmLoading } = usePaymentMethod();
  const portal = useBillingPortal();

  // The Stripe Customer Portal is now only for managing the saved card /
  // receipts (PaymentMethodCard). Plan changes happen in-app — see below.
  async function openPortal() {
    try {
      const { url } = await portal.mutateAsync();
      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't open the billing portal.",
      );
    }
  }


  function handleChangePlan() {
    setPickerOpen(true);
  }

  // The pricing page deep-links here with the plan the visitor clicked, so the
  // picker opens on it rather than making them find it again. Seeded once at
  // mount — arriving with `?plan=` *is* the trigger, so there's nothing to sync.
  const deepLinkedPlan = readPlanParam(searchParams.get("plan"));
  const deepLinkedCycle = readCycleParam(searchParams.get("cycle"));
  const [pickerOpen, setPickerOpen] = React.useState(() =>
    Boolean(deepLinkedPlan),
  );

  function handlePickerOpenChange(open: boolean) {
    setPickerOpen(open);
    // Drop ?plan= on close, so a refresh (or a back-nav) doesn't reopen the
    // picker on a plan the user already dismissed.
    if (!open && deepLinkedPlan) {
      router.replace(pathname, { scroll: false });
    }
  }

  const isLoading = subLoading || plansLoading;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Billing & subscription"
        description="Manage your plan, payment method and invoices."
      />

      {isLoading && <BillingSkeleton />}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your billing details</AlertTitle>
          <AlertDescription>
            Refresh the page to try again. If it keeps happening, sign out and
            back in.
          </AlertDescription>
        </Alert>
      )}

      {subscription && plans && (
        <>
          <CurrentPlanCard
            subscription={subscription}
            plans={plans}
            onChangePlan={handleChangePlan}
          />

          <PaymentMethodCard
            paymentMethod={paymentMethod}
            subscription={subscription}
            isLoading={pmLoading}
            onManageBilling={USE_REAL_BACKEND ? openPortal : undefined}
            managing={portal.isPending}
          />

          <InvoicesCard />

          <PlanPickerDialog
            open={pickerOpen}
            onOpenChange={handlePickerOpenChange}
            plans={plans}
            subscription={subscription}
            initialPlanId={deepLinkedPlan}
            initialCycle={deepLinkedCycle}
          />
        </>
      )}
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
