import { AdminProjectsTable } from "@/components/admin/admin-projects-table";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Project monitoring"
        description="Track every project moving through the pipeline."
      />
      <AdminProjectsTable />
    </div>
  );
}
