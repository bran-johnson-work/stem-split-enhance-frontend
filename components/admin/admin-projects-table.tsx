"use client";

// Read-only project monitor for admins (GET /admin/projects). Every project in
// the platform, with owner and output availability. Search / status filtering,
// sorting, and pagination are client-side over a single fetched page. Clicking a
// row opens a read-only detail panel. No mutations — the admin API is read-only.

import * as React from "react";
import { Search } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminProjects } from "@/lib/hooks/queries";
import { formatDate } from "@/lib/format";
import type { AdminProject, AdminProjectStatus } from "@/lib/types";

const PAGE_SIZE = 10;

// The status filter options, in lifecycle order. `all` first.
const STATUS_OPTIONS: { value: "all" | AdminProjectStatus; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "pending", label: "Pending" },
  { value: "uploading", label: "Uploading" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export function AdminProjectsTable() {
  const { data: projects, isPending, isError } = useAdminProjects();

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"all" | AdminProjectStatus>("all");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<AdminProject | null>(null);

  // Reset paging at the filter source rather than in an effect (which would
  // trigger a cascading render).
  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onStatus = (v: "all" | AdminProjectStatus) => {
    setStatus(v);
    setPage(1);
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects ?? [])
      .filter((p) => {
        if (status !== "all" && p.status !== status) return false;
        if (q && !`${p.name} ${p.ownerEmail}`.toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [projects, search, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by name or owner email…"
              className="pl-8"
              aria-label="Search projects"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => onStatus(v as "all" | AdminProjectStatus)}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Outputs</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <LoadingRows />
              ) : isError ? (
                <MessageRow>Couldn&apos;t load projects.</MessageRow>
              ) : rows.length === 0 ? (
                <MessageRow>No projects match your filters.</MessageRow>
              ) : (
                rows.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(p)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.ownerEmail}
                    </TableCell>
                    <TableCell>
                      <AdminStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.outputFileCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-sm">
                      {formatDate(p.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isPending && !isError && filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {(current - 1) * PAGE_SIZE + 1}–
              {Math.min(current * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={current <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <ProjectDetailDialog
        project={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </Card>
  );
}

function ProjectDetailDialog({
  project,
  onOpenChange,
}: {
  project: AdminProject | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {project && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate">{project.name}</DialogTitle>
              <DialogDescription>
                Owned by {project.ownerEmail}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
              <DetailRow label="Status">
                <AdminStatusBadge status={project.status} />
              </DetailRow>
              <DetailRow label="Outputs">
                {project.hasOutputs
                  ? `${project.outputFileCount} file${project.outputFileCount === 1 ? "" : "s"}`
                  : "None yet"}
              </DetailRow>
              <DetailRow label="Created">{formatDate(project.createdAt)}</DetailRow>
              <DetailRow label="Updated">{formatDate(project.updatedAt)}</DetailRow>
              <DetailRow label="Project ID">
                <span className="font-mono text-xs break-all">{project.id}</span>
              </DetailRow>
              <DetailRow label="Owner ID">
                <span className="font-mono text-xs break-all">
                  {project.userId}
                </span>
              </DetailRow>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="col-span-3 flex items-start gap-4 sm:col-span-1 sm:flex-col sm:gap-1">
      <dt className="text-muted-foreground w-24 shrink-0 sm:w-auto">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={5}>
            <Skeleton className="h-8 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell
        colSpan={5}
        className="text-muted-foreground h-24 text-center text-sm"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}
