"use client";

import * as React from "react";
import { CircleAlert, UploadCloud } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTR,
  ACCEPTED_LABEL,
  validateAudioFile,
} from "@/lib/validations/upload";

export function UploadDropzone({
  onFilesAccepted,
  maxFileSizeMb,
  disabled = false,
}: {
  onFilesAccepted: (files: File[]) => void;
  /** Active plan's per-file ceiling in MB. Undefined while the plan loads. */
  maxFileSizeMb?: number;
  disabled?: boolean;
}) {
  const maxBytes =
    maxFileSizeMb != null ? maxFileSizeMb * 1024 * 1024 : undefined;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);
  const [dragActive, setDragActive] = React.useState(false);
  const [rejects, setRejects] = React.useState<string[]>([]);

  const accept = React.useCallback(
    (list: FileList | null) => {
      const files = list ? Array.from(list) : [];
      if (files.length === 0) return;

      const accepted: File[] = [];
      const rejected: string[] = [];
      for (const file of files) {
        const result = validateAudioFile(file, maxBytes);
        if (result.ok) accepted.push(file);
        else rejected.push(`${file.name} — ${result.error}`);
      }

      setRejects(rejected);
      if (accepted.length) onFilesAccepted(accepted);
    },
    [onFilesAccepted, maxBytes],
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
    setRejects([]);
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
        aria-label="Upload tracks. Drag and drop audio files here, or activate to browse."
        className={cn(
          "group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center outline-none transition-colors",
          "border-border hover:border-brand/50 hover:bg-muted/40",
          "focus-visible:border-brand focus-visible:ring-ring/40 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:opacity-60",
          dragActive && "border-brand bg-brand-tint/60",
          rejects.length > 0 && "border-destructive/60 bg-destructive/5",
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
              ? "Drop your tracks to upload"
              : "Drag & drop your tracks"}
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
          {ACCEPTED_LABEL}
          {maxBytes != null ? ` · up to ${formatBytes(maxBytes)} each` : ""}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />

      {rejects.length > 0 && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>
            <span className="font-medium">
              {rejects.length === 1
                ? "1 file wasn't added:"
                : `${rejects.length} files weren't added:`}
            </span>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {rejects.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
