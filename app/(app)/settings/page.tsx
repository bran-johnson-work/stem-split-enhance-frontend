import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/page-header";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Account settings"
      description="Manage your profile, password and preferences."
      phase="Phase 3"
      icon={Settings}
    />
  );
}
