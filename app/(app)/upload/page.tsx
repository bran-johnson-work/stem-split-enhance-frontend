"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { CreateProjectDialog } from "@/components/upload/create-project-dialog";
import { ProjectPicker } from "@/components/upload/project-picker";
import { ProjectUploader } from "@/components/upload/project-uploader";
import { UploadGateNotice } from "@/components/upload/upload-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { findPlan } from "@/lib/billing/plans";
import { usePlans, useSubscription } from "@/lib/hooks/queries";
import { useMonthlyUsage } from "@/lib/hooks/use-monthly-usage";
import { useUploadGate } from "@/lib/hooks/use-upload-gate";
import { queryKeys } from "@/lib/query/keys";
import type { Project } from "@/lib/types";

export default function UploadPage() {
  const queryClient = useQueryClient();

  // Enforce the plan (KN-47): past due, canceled, or over this month's file cap
  // and the uploader is replaced by an upgrade prompt. The backend enforces the
  // cap too — it refuses the presigned URL — so a mid-session change is caught.
  const { gate } = useUploadGate();

  // The plan's monthly audio-file allowance + what's been used, to show and cap.
  const { data: sub } = useSubscription();
  const { data: plans } = usePlans();
  const { used } = useMonthlyUsage();
  const plan = sub && plans ? findPlan(plans, sub.planId) : undefined;
  const cap = plan?.uploadsPerMonth ?? "unlimited";

  // Create-project-first: no audio is uploaded until a project exists.
  const [project, setProject] = React.useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  async function handleCreate(name: string) {
    setCreating(true);
    try {
      const created = await api.createEmptyProject(name);
      // Show the new (empty) project in the list right away.
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      setProject(created);
      setDialogOpen(false);
      toast.success(`Project "${created.title}" created — add your audio.`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Upload tracks"
        description="Create a project, then drop in your songs and we'll separate each into stems and deliver a polished master."
      />

      {!gate.allowed && !project ? (
        // Blocked with no project open: the upgrade prompt takes over.
        <UploadGateNotice gate={gate} />
      ) : project ? (
        <ProjectUploader
          key={project.id}
          project={project}
          cap={cap}
          maxFileSizeMb={plan?.maxFileSizeMb}
          usedThisMonth={used}
          onNewProject={() => {
            setProject(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <div className="space-y-6">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <span className="bg-muted text-muted-foreground grid size-14 place-items-center rounded-full">
                <FolderPlus className="size-6" aria-hidden />
              </span>
              <div className="space-y-1.5">
                <p className="text-lg font-medium">Create a project to get started</p>
                <p className="text-muted-foreground mx-auto max-w-sm text-sm">
                  Every upload lives in a project. Name one, then add the audio
                  files you want separated into stems.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <FolderPlus className="size-4" />
                New project
              </Button>
            </CardContent>
          </Card>

          {/* Resume an unfinished project instead of stranding it empty. */}
          <ProjectPicker onSelect={setProject} />
        </div>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
        isPending={creating}
      />
    </div>
  );
}
