import { ListMusic } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/page-header";

export default function AdminProjectsPage() {
  return (
    <PlaceholderPage
      title="Project monitoring"
      description="Track every project moving through the pipeline."
      phase="Phase 4"
      icon={ListMusic}
    />
  );
}
