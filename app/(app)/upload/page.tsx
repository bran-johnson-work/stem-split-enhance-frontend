"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { UploadQueue } from "@/components/upload/upload-queue";
import { Button } from "@/components/ui/button";
import { useCreateProject } from "@/lib/hooks/queries";
import {
  useUploadQueue,
  type QueueItem,
} from "@/lib/hooks/use-upload-queue";
import { selectUploader } from "@/lib/upload/upload-file";

export default function UploadPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const uploader = React.useMemo(() => selectUploader(), []);

  // Each queue item creates at most one project, even if it's retried.
  const created = React.useRef(new Set<string>());

  const handleItemSuccess = React.useCallback(
    (item: QueueItem) => {
      if (created.current.has(item.id)) return;
      created.current.add(item.id);
      createProject.mutate(
        {
          sourceFileName: item.file.name,
          sourceSizeBytes: item.file.size,
          storagePath: item.result?.storagePath,
        },
        {
          onSuccess: (project) =>
            toast.success(`"${project.title}" added to your projects.`),
        },
      );
    },
    [createProject],
  );

  const queue = useUploadQueue({
    uploader,
    onItemSuccess: handleItemSuccess,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Upload tracks"
        description="Drop in your songs and we'll separate each into stems and deliver a polished master."
      />

      <UploadDropzone onFilesAccepted={queue.add} />

      <UploadQueue {...queue} />

      {queue.stats.success > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => router.push("/projects")}>
            View in projects
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
