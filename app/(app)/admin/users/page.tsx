import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="View and monitor KlearNote accounts."
      />
      <AdminUsersTable />
    </div>
  );
}
