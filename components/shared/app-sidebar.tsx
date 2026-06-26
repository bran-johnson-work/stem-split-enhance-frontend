"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/lib/hooks/queries";
import { adminNav, appNav, type NavItem } from "@/lib/nav";

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/dashboard" || href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const isActive = useIsActive();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.href)}
              tooltip={item.title}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { data: user } = useCurrentUser();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Workspace" items={appNav} />
        {user?.role === "admin" && <NavGroup label="Admin" items={adminNav} />}
      </SidebarContent>
      <SidebarFooter className="px-3 pb-3">
        <p className="text-muted-foreground px-2 text-xs">
          {user?.subscription.planId
            ? `${user.subscription.planId.toUpperCase()} plan`
            : "KlearNote"}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
