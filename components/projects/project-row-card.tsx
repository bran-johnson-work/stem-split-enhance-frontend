import Link from "next/link";
import { ProjectProgress } from "@/components/projects/project-progress";
import { StatusBadge } from "@/components/projects/status-badge";
import { formatBytes, formatDuration, formatRelative } from "@/lib/format";
import { isProcessing } from "@/lib/processing/pipeline";
import type { Project } from "@/lib/types";

/**
 * Mobile-friendly project row (KN-28). Renders below `md` in place of the
 * table; the whole card is a single link to the project detail route.
 */
export function ProjectRowCard({ project: p }: { project: Project }) {
  const meta = [
    p.durationSec ? formatDuration(p.durationSec) : null,
    formatBytes(p.sourceSizeBytes),
    formatRelative(p.updatedAt),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/projects/${p.id}`}
      className="bg-card hover:bg-muted/40 block rounded-xl border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{p.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {p.sourceFileName}
          </p>
        </div>
        <StatusBadge status={p.status} className="shrink-0" />
      </div>

      {isProcessing(p.status) && p.progress > 0 && (
        <ProjectProgress project={p} className="mt-3" />
      )}

      <p className="text-muted-foreground mt-3 text-xs tabular-nums">{meta}</p>
    </Link>
  );
}
