import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/page-header";

export default function AdminUsersPage() {
  return (
    <PlaceholderPage
      title="User management"
      description="View and manage KlearNote accounts."
      phase="Phase 4"
      icon={Users}
    />
  );
}
