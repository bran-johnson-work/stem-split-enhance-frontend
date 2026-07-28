"use client";

// Read-only user directory for admins (GET /admin/users). Search / role / status
// filtering, sorting, and pagination are all client-side over a single fetched
// page — the admin API is read-only and unpaginated in the UI (see lib/api/admin
// LIST_LIMIT). No mutations: the backend exposes no write endpoints here.

import * as React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAdminUsers } from "@/lib/hooks/queries";
import { formatDate, initials } from "@/lib/format";
import type { AdminUser } from "@/lib/types";

const PAGE_SIZE = 10;
type RoleFilter = "all" | "admin" | "user";
type StatusFilter = "all" | "active" | "inactive";

export function AdminUsersTable() {
  const { data: users, isPending, isError } = useAdminUsers();

  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState<RoleFilter>("all");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);

  // Any filter change invalidates the current page offset, so reset it at the
  // source rather than in an effect (which would cause a cascading render).
  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onRole = (v: RoleFilter) => {
    setRole(v);
    setPage(1);
  };
  const onStatus = (v: StatusFilter) => {
    setStatus(v);
    setPage(1);
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? [])
      .filter((u) => {
        if (role !== "all" && u.role !== role) return false;
        if (status === "active" && !u.isActive) return false;
        if (status === "inactive" && u.isActive) return false;
        if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [users, search, role, status]);

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
              placeholder="Search by name or email…"
              className="pl-8"
              aria-label="Search users"
            />
          </div>
          <Select value={role} onValueChange={(v) => onRole(v as RoleFilter)}>
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => onStatus(v as StatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <LoadingRows />
              ) : isError ? (
                <MessageRow>Couldn&apos;t load users.</MessageRow>
              ) : rows.length === 0 ? (
                <MessageRow>No users match your filters.</MessageRow>
              ) : (
                rows.map((u) => <UserRow key={u.id} user={u} />)
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
    </Card>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {user.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role === "admin" ? "Admin" : "User"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {user.isVerified ? "Verified" : "Unverified"}
        </Badge>
      </TableCell>
      <TableCell>
        <span
          className={
            user.isActive
              ? "text-completed text-sm font-medium"
              : "text-muted-foreground text-sm font-medium"
          }
        >
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-right text-sm">
        {formatDate(user.createdAt)}
      </TableCell>
    </TableRow>
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
