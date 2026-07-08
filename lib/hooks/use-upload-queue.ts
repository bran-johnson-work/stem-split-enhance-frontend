"use client";

import * as React from "react";
import {
  isAbortError,
  type Uploader,
  type UploadResult,
} from "@/lib/upload/upload-file";

export type QueueStatus =
  | "queued"
  | "uploading"
  | "success"
  | "error"
  | "canceled";

export interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  progress: number; // 0..100
  error?: string;
  result?: UploadResult;
}

export interface UploadQueue {
  items: QueueItem[];
  add: (files: File[]) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  stats: {
    total: number;
    queued: number;
    uploading: number;
    success: number;
    error: number;
    overallProgress: number;
  };
}

const key = (f: File) => `${f.name}:${f.size}`;

export function useUploadQueue({
  uploader,
  concurrency = 2,
  onItemSuccess,
}: {
  uploader: Uploader;
  concurrency?: number;
  onItemSuccess?: (item: QueueItem) => void;
}): UploadQueue {
  const [items, setItems] = React.useState<QueueItem[]>([]);

  // Latest-value refs so the scheduler stays stable across prop changes.
  const uploaderRef = React.useRef(uploader);
  const onSuccessRef = React.useRef(onItemSuccess);
  React.useEffect(() => {
    uploaderRef.current = uploader;
    onSuccessRef.current = onItemSuccess;
  });

  // Authoritative set of in-flight uploads (also our active-count source).
  const controllers = React.useRef(new Map<string, AbortController>());

  const patch = React.useCallback(
    (id: string, next: Partial<QueueItem>) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...next } : it)),
      );
    },
    [],
  );

  const start = React.useCallback(
    (item: QueueItem) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patch(item.id, { status: "uploading", progress: 0, error: undefined });

      uploaderRef.current(item.file, {
        signal: controller.signal,
        onProgress: (pct) => patch(item.id, { progress: pct }),
      })
        .then((result) => {
          controllers.current.delete(item.id);
          patch(item.id, { status: "success", progress: 100, result });
          onSuccessRef.current?.({
            ...item,
            status: "success",
            progress: 100,
            result,
          });
        })
        .catch((err: unknown) => {
          controllers.current.delete(item.id);
          // cancel()/remove() already set the terminal state — don't clobber it.
          if (isAbortError(err)) return;
          patch(item.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          });
        });
    },
    [patch],
  );

  // Scheduler: fill open slots with queued items whenever the queue changes.
  React.useEffect(() => {
    let slots = concurrency - controllers.current.size;
    if (slots <= 0) return;
    for (const item of items) {
      if (slots <= 0) break;
      if (item.status === "queued" && !controllers.current.has(item.id)) {
        start(item);
        slots -= 1;
      }
    }
  }, [items, concurrency, start]);

  // Abort everything still in flight on unmount.
  React.useEffect(() => {
    const map = controllers.current;
    return () => {
      map.forEach((c) => c.abort());
      map.clear();
    };
  }, []);

  const add = React.useCallback((files: File[]) => {
    setItems((prev) => {
      const seen = new Set(
        prev.filter((it) => it.status !== "canceled").map((it) => key(it.file)),
      );
      const additions: QueueItem[] = [];
      for (const file of files) {
        const k = key(file);
        if (seen.has(k)) continue;
        seen.add(k);
        additions.push({
          id: crypto.randomUUID(),
          file,
          status: "queued",
          progress: 0,
        });
      }
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, []);

  const cancel = React.useCallback(
    (id: string) => {
      controllers.current.get(id)?.abort();
      patch(id, { status: "canceled", progress: 0 });
    },
    [patch],
  );

  const retry = React.useCallback(
    (id: string) => {
      controllers.current.delete(id);
      patch(id, { status: "queued", progress: 0, error: undefined });
    },
    [patch],
  );

  const remove = React.useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    controllers.current.forEach((c) => c.abort());
    controllers.current.clear();
    setItems([]);
  }, []);

  const stats = React.useMemo(() => {
    const count = (s: QueueStatus) =>
      items.filter((it) => it.status === s).length;
    const counted = items.filter((it) => it.status !== "canceled");
    const overallProgress = counted.length
      ? Math.round(
          counted.reduce(
            (sum, it) => sum + (it.status === "success" ? 100 : it.progress),
            0,
          ) / counted.length,
        )
      : 0;
    return {
      total: items.length,
      queued: count("queued"),
      uploading: count("uploading"),
      success: count("success"),
      error: count("error"),
      overallProgress,
    };
  }, [items]);

  return { items, add, cancel, retry, remove, clear, stats };
}
