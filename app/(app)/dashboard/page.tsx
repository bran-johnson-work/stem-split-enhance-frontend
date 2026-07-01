"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { StatusBadge } from "@/components/projects/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format";
import { useCurrentUser, useProjects } from "@/lib/hooks/queries";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useProjects();
  const projects = data?.items ?? [];
  const processing = projects.filter(
    (p) => !["completed", "failed"].includes(p.status),
  ).length;
  const completed = projects.filter((p) => p.status === "completed").length;

  const stats = [
    { label: "Total projects", value: data?.total ?? 0 },
    { label: "Processing", value: processing },
    { label: "Completed", value: completed },
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
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-12" />
              ) : (
                <span className="text-3xl font-semibold">{s.value}</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-3">
                <Skeleton className="h-6 w-full" />
              </div>
            ))
          ) : projects.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No projects yet. Upload your first track to get started.
            </p>
          ) : (
            projects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="hover:bg-muted/40 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {p.sourceFileName} · {formatRelative(p.updatedAt)}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
