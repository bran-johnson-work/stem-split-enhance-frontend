import { ListMusic } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/page-header";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PlaceholderPage
      title="Project detail"
      description={`Stems, master and downloads for ${id}.`}
      phase="Phase 2"
      icon={ListMusic}
    />
  );
}
