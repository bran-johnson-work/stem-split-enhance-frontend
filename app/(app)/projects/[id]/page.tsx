"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { ProcessingView } from "@/components/processing/processing-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/hooks/queries";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading, isError } = useProject(id);

  if (isLoading) return <ProjectDetailSkeleton />;

  if (isError || !project) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
            <SearchX className="size-6" />
          </div>
          <p className="font-medium">Project not found</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            We couldn&apos;t find a project with id{" "}
            <span className="font-mono">{id}</span>. It may have been removed.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/projects">
              <ArrowLeft className="size-4" />
              Back to projects
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ProcessingView project={project} />;
}

function ProjectDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
