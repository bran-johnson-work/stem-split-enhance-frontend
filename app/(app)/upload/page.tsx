"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const [file, setFile] = React.useState<File | null>(null);

  function startProcessing() {
    if (!file) return;

    toast.success(`"${file.name}" is validated and ready to process.`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Upload a track"
        description="Drop in a song and we'll separate it into stems and deliver a polished master."
      />

      <UploadDropzone
        file={file}
        onFileAccepted={setFile}
        onClear={() => setFile(null)}
      />

      {file && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setFile(null)}>
            Cancel
          </Button>
          <Button onClick={startProcessing}>Start processing</Button>
        </div>
      )}
    </div>
  );
}
