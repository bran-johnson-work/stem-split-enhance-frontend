"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { UploadGateNotice } from "@/components/upload/upload-gate";
import { UploadQueue } from "@/components/upload/upload-queue";
import { Button } from "@/components/ui/button";
import { useUploadBatch } from "@/lib/hooks/use-upload-batch";
import { useUploadGate } from "@/lib/hooks/use-upload-gate";

export default function UploadPage() {
  const router = useRouter();

  // Enforce the plan (KN-47): over the monthly cap, past due or canceled, and
  // the dropzone is replaced by an upgrade prompt. The mock/real createProject
  // enforces the cap server-side too, so a mid-session change is still caught.
  const { gate } = useUploadGate();

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

      {!gate.allowed && queue.items.length === 0 ? (
        // Blocked with nothing in flight: the upgrade prompt takes over.
        <UploadGateNotice gate={gate} />
      ) : (
        <>
          {/* If they get blocked mid-batch, let the in-flight queue finish but
              stop them adding more — the createProject cap is the backstop. */}
          <UploadDropzone onFilesAccepted={queue.add} disabled={!gate.allowed} />

          <UploadQueue {...queue} />

          {queue.stats.success > 0 && (
            <div className="flex justify-end">
              <Button onClick={() => router.push("/projects")}>
                View in projects
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
