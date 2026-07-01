import { FolderClock } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/page-header";

export default function ProjectsPage() {
  return (
    <PlaceholderPage
      title="Projects"
      description="Every track you've uploaded and its processing status."
      phase="Phase 2"
      icon={FolderClock}
    />
  );
}
