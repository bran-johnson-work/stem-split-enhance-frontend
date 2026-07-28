import { AdminOverview } from "@/components/admin/admin-overview";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin overview"
        description="Platform health, revenue, and growth at a glance."
      />
      <AdminOverview />
    </div>
  );
}
