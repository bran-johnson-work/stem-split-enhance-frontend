"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderClock, SearchX, Upload } from "lucide-react";
import { ProjectRowCard } from "@/components/projects/project-row-card";
import { ProjectsPagination } from "@/components/projects/projects-pagination";
import { ProjectsTable } from "@/components/projects/projects-table";
import { ProjectsToolbar } from "@/components/projects/projects-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/lib/hooks/queries";
import {
  HISTORY_PAGE_SIZE,
  parseStatusFilter,
  statusesForFilter,
  type StatusFilter,
} from "@/lib/projects/filters";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Project history (KN-28). Owns the filter/pagination state, which lives in the
 * URL (`?q=&status=&page=`) so it's shareable and survives back/forward, and
 * feeds `useProjects`. Renders the table (desktop) / cards (mobile), with
 * distinct loading, error, empty (first-run) and no-results (filtered) states.
 */
export function ProjectsHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  // Local mirror of the search box so typing stays responsive; the URL (the
  // source of truth for the query) is updated on a debounce.
  const [searchText, setSearchText] = useState(q);

  // Write a set of params to the URL, reading the live URL so this stays stable
  // (no dependency on `searchParams`) and never uses a stale base.
  const commit = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearchText(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => commit({ q: value || null, page: null }),
      SEARCH_DEBOUNCE_MS,
    );
  };
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  const handleStatusChange = (value: StatusFilter) =>
    commit({ status: value === "all" ? null : value, page: null });

  const handlePageChange = (next: number) =>
    commit({ page: next <= 1 ? null : String(next) });

  const clearFilters = () => {
    setSearchText("");
    commit({ q: null, status: null, page: null });
  };

  const { data, isLoading, isFetching, isError } = useProjects({
    page,
    pageSize: HISTORY_PAGE_SIZE,
    search: q,
    status: statusesForFilter(statusFilter),
  });

  const projects = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const filtersActive = q !== "" || statusFilter !== "all";

  // Recover gracefully if the URL points past the last page (e.g. after a
  // filter shrinks the set, or a hand-edited `?page=`).
  useEffect(() => {
    if (!isLoading && page > totalPages) {
      commit({ page: totalPages <= 1 ? null : String(totalPages) });
    }
  }, [isLoading, page, totalPages, commit]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Every track you've uploaded and its processing status."
        action={
          <Button asChild>
            <Link href="/upload">
              <Upload className="size-4" /> New upload
            </Link>
          </Button>
        }
      />

      <ProjectsToolbar
        search={searchText}
        onSearchChange={handleSearchChange}
        status={statusFilter}
        onStatusChange={handleStatusChange}
      />

      {isLoading ? (
        <HistorySkeleton />
      ) : isError ? (
        // A failed request must never render as "no projects yet" — that tells
        // a user with a full library that their work is gone.
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your projects</AlertTitle>
          <AlertDescription>
            Refresh the page to try again. If it keeps happening, sign out and
            back in.
          </AlertDescription>
        </Alert>
      ) : total === 0 ? (
        <EmptyState filtersActive={filtersActive} onClear={clearFilters} />
      ) : (
        <div
          className={cn(
            "space-y-4 transition-opacity",
            isFetching && "opacity-60",
          )}
        >
          <ProjectsTable projects={projects} />
          <div className="space-y-3 md:hidden">
            {projects.map((p) => (
              <ProjectRowCard key={p.id} project={p} />
            ))}
          </div>
          <ProjectsPagination
            page={page}
            pageSize={HISTORY_PAGE_SIZE}
            total={total}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="divide-y rounded-xl border">
      {Array.from({ length: HISTORY_PAGE_SIZE }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
          <Skeleton className="hidden h-4 w-16 shrink-0 sm:block" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  filtersActive,
  onClear,
}: {
  filtersActive: boolean;
  onClear: () => void;
}) {
  if (filtersActive) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
            <SearchX className="size-6" />
          </div>
          <p className="font-medium">No matching projects</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            No tracks match your search and filter. Try a different term or
            status.
          </p>
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
          <FolderClock className="size-6" />
        </div>
        <p className="font-medium">No projects yet</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Upload your first track and it&apos;ll show up here with its stems and
          master as soon as it&apos;s processed.
        </p>
        <Button asChild>
          <Link href="/upload">
            <Upload className="size-4" /> Upload a track
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
