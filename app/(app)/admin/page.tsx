import { Shield } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/page-header";

export default function AdminOverviewPage() {
  return (
    <PlaceholderPage
      title="Admin overview"
      description="Platform health and key metrics at a glance."
      phase="Phase 4"
      icon={Shield}
    />
  );
}
