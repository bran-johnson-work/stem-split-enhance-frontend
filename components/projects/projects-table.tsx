"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProjectProgress } from "@/components/projects/project-progress";
import { StatusBadge } from "@/components/projects/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes, formatDuration, formatRelative } from "@/lib/format";
import type { Project } from "@/lib/types";

/**
 * Desktop project history table (KN-28). Hidden below `md`, where
 * ProjectRowCard takes over. The whole row navigates to the project on click
 * (mouse); the title is a real link so the row is reachable by keyboard too.
 */
export function ProjectsTable({ projects }: { projects: Project[] }) {
  const router = useRouter();

  return (
    <div className="hidden rounded-xl border md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Track</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-40">Progress</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Updated</TableHead>
            <TableHead className="w-10 pr-4" aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => (
            <TableRow
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="group cursor-pointer"
            >
              <TableCell className="max-w-[22rem] pl-4">
                <Link
                  href={`/projects/${p.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {p.sourceFileName}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={p.status} />
              </TableCell>
              <TableCell>
                <ProjectProgress project={p} />
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {p.durationSec ? formatDuration(p.durationSec) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {formatBytes(p.sourceSizeBytes)}
              </TableCell>
              <TableCell className="text-muted-foreground text-right tabular-nums">
                {formatRelative(p.updatedAt)}
              </TableCell>
              <TableCell className="pr-4">
                <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
