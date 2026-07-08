import { Suspense } from "react";
import { ProjectsHistory } from "@/components/projects/projects-history";

// ProjectsHistory reads filter/pagination state from the URL (useSearchParams),
// which Next requires to sit inside a Suspense boundary for static rendering.
export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsHistory />
    </Suspense>
  );
}
