"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FolderClock,
  Loader2,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProjectProgress } from "@/components/projects/project-progress";
import { StatusBadge } from "@/components/projects/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { useCurrentUser, useProjects } from "@/lib/hooks/queries";
import { isProcessing } from "@/lib/processing/pipeline";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
  iconClassName: string;
}

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useProjects();
  const projects = data?.items ?? [];
  const processing = projects.filter((p) => isProcessing(p.status)).length;
  const completed = projects.filter((p) => p.status === "completed").length;

  const stats: Stat[] = [
    {
      label: "Total projects",
      value: data?.total ?? 0,
      href: "/projects",
      icon: FolderClock,
      iconClassName: "bg-muted text-muted-foreground",
    },
    {
      label: "Processing",
      value: processing,
      href: "/projects?status=processing",
      icon: Loader2,
      iconClassName: "bg-analyzing/15 text-analyzing",
    },
    {
      label: "Completed",
      value: completed,
      href: "/projects?status=completed",
      icon: CheckCircle2,
      iconClassName: "bg-completed/15 text-completed",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Here's what's happening with your tracks."
        action={
          <Button asChild>
            <Link href="/upload">
              <Upload className="size-4" /> New upload
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-[3px]"
          >
            <Card className="hover:border-foreground/20 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {s.label}
                </CardTitle>
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    s.iconClassName,
                  )}
                >
                  <s.icon className="size-4" />
                </span>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-9 w-12" />
                ) : (
                  <span className="text-3xl font-semibold tabular-nums">
                    {s.value}
                  </span>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent projects</CardTitle>
          {projects.length > 0 && (
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-medium transition-colors"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          )}
        </CardHeader>
        <CardContent className="divide-border/60 divide-y">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-3">
                <Skeleton className="h-6 w-full" />
              </div>
            ))
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
                <FolderClock className="size-6" />
              </div>
              <p className="font-medium">No projects yet</p>
              <p className="text-muted-foreground max-w-xs text-sm">
                Upload your first track to get stems and an enhanced master.
              </p>
              <Button asChild className="mt-1">
                <Link href="/upload">
                  <Upload className="size-4" /> Upload a track
                </Link>
              </Button>
            </div>
          ) : (
            projects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="hover:bg-muted/40 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {p.sourceFileName} · {formatRelative(p.updatedAt)}
                  </p>
                  {isProcessing(p.status) && p.progress > 0 && (
                    <ProjectProgress project={p} className="mt-2 max-w-56" />
                  )}
                </div>
                <StatusBadge status={p.status} className="shrink-0" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
