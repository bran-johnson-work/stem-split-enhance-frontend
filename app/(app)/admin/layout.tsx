import { AdminGuard } from "@/components/admin/admin-guard";

// Gates every /admin/* route behind the ADMIN role in one place. Stays a Server
// Component; the "use client" boundary is pushed down into AdminGuard.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
