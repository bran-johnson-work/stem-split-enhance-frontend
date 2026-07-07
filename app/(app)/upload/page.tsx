"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { UploadQueue } from "@/components/upload/upload-queue";
import { Button } from "@/components/ui/button";
import { useUploadBatch } from "@/lib/hooks/use-upload-batch";

export default function UploadPage() {
  const router = useRouter();

  // One project per batch: the queue uploads each file, and the batch hook
  // finalises them into a single project once the queue drains (see
  // lib/hooks/use-upload-batch + lib/upload/upload-batch).
  const queue = useUploadBatch();

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
