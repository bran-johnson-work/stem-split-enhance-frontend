import { CreditCard } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/page-header";

export default function BillingPage() {
  return (
    <PlaceholderPage
      title="Billing & subscription"
      description="Manage your plan, payment method and invoices."
      phase="Phase 3"
      icon={CreditCard}
    />
  );
}
