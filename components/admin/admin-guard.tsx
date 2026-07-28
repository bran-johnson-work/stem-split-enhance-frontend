"use client";

// Hard role gate for /admin/*. proxy.ts only checks for a session (any logged-in
// user could otherwise reach these routes); this enforces the ADMIN role on the
// client the same way the sidebar hides the Admin group. The backend guards every
// /admin API with 403 regardless, so this is UX, not the security boundary — a
// non-admin who forces the URL sees a redirect instead of empty error states.

import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/lib/hooks/queries";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isPending } = useCurrentUser();

  // Role isn't known until /users/me resolves — show a skeleton rather than
  // flashing the dashboard (or an unauthorized redirect) on first paint.
  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  // A failed /users/me (no/expired session) is already routed to /login by the
  // central 401 handler; anyone resolved as a non-admin goes back to their own
  // dashboard.
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
