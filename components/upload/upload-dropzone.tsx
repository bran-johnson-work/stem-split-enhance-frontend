"use client";

import * as React from "react";
import { CircleAlert, FileAudio, UploadCloud, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTR,
  ACCEPTED_LABEL,
  MAX_UPLOAD_BYTES,
  validateAudioFile,
} from "@/lib/validations/upload";

export function UploadDropzone({
  file,
  onFileAccepted,
  onClear,
  disabled = false,
}: {
  file: File | null;
  onFileAccepted: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);
  const [dragActive, setDragActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const accept = React.useCallback(
    (files: FileList | null) => {
      const picked = files?.[0];
      if (!picked) return;
      const result = validateAudioFile(picked);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      onFileAccepted(picked);
    },
    [onFileAccepted],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (disabled) return;
    accept(e.dataTransfer.files);
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setError(null);
    setDragActive(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragActive(false);
    }
  }

  if (file) {
    return (
      <div className="bg-card flex items-center gap-4 rounded-xl border p-4">
        <div className="bg-brand-tint text-brand grid size-12 shrink-0 place-items-center rounded-lg">
          <FileAudio className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-muted-foreground text-sm">
            {formatBytes(file.size)} · Ready to process
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label={`Remove ${file.name}`}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        aria-label="Upload a track. Drag and drop an audio file here, or activate to browse."
        className={cn(
          "group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center outline-none transition-colors",
          "border-border hover:border-brand/50 hover:bg-muted/40",
          "focus-visible:border-brand focus-visible:ring-ring/40 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:opacity-60",
          dragActive && "border-brand bg-brand-tint/60",
          error && "border-destructive/60 bg-destructive/5",
        )}
      >
        <span
          className={cn(
            "bg-muted text-muted-foreground grid size-14 place-items-center rounded-full transition-colors",
            "group-hover:bg-brand/10 group-hover:text-brand",
            dragActive && "bg-brand/15 text-brand",
          )}
        >
          <UploadCloud className="size-7" />
        </span>
        <span className="space-y-1">
          <span className="block font-medium">
            {dragActive
              ? "Drop your track to upload"
              : "Drag & drop your track"}
          </span>
          <span className="text-muted-foreground block text-sm">
            or{" "}
            <span className="text-brand font-medium underline-offset-4 group-hover:underline">
              browse files
            </span>{" "}
            from your device
          </span>
        </span>
        <span className="text-muted-foreground text-xs">
          {ACCEPTED_LABEL} · up to {formatBytes(MAX_UPLOAD_BYTES)}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
