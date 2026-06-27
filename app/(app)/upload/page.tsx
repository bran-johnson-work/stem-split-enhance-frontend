import { Upload } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/page-header";

export default function UploadPage() {
  return (
    <PlaceholderPage
      title="Upload"
      description="Drop in a track to separate into stems and master."
      phase="Phase 2"
      icon={Upload}
    />
  );
}
