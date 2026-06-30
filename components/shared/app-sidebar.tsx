"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  useSidebar,
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

/**
 * Sidebar brand row. When expanded it shows the full KlearNote lockup plus a
 * button that collapses the rail. When collapsed (icon-width) it shrinks to
 * the square logo mark; hovering that mark swaps it for an expand icon, and
 * clicking it expands the sidebar again.
 */
function SidebarBrand() {
  const { toggleSidebar } = useSidebar();

  return (
    <SidebarHeader className="p-2">
      {/* Expanded: full logo + collapse button */}
      <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
        <Logo className="ml-1" />
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {/* Collapsed: K mark (red in light mode, white in dark) that turns into
          an expand icon on hover */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Expand sidebar"
        title="Expand sidebar"
        className="group/brand hover:bg-sidebar-accent hidden size-8 shrink-0 items-center justify-center rounded-md transition-colors group-data-[collapsible=icon]:flex"
      >
        <span className="group-hover/brand:hidden">
          <Image
            src="/logo-mark-red.png"
            alt=""
            aria-hidden
            width={20}
            height={20}
            className="size-5 dark:hidden"
          />
          <Image
            src="/logo-mark-white.png"
            alt=""
            aria-hidden
            width={20}
            height={20}
            className="hidden size-5 dark:block"
          />
        </span>
        <PanelLeftOpen className="text-sidebar-foreground hidden size-4 group-hover/brand:block" />
      </button>
    </SidebarHeader>
  );
}

export function AppSidebar() {
  const { data: user } = useCurrentUser();

  return (
    <Sidebar collapsible="icon">
      <SidebarBrand />
      <SidebarContent>
        <NavGroup label="Workspace" items={appNav} />
        {user?.role === "admin" && <NavGroup label="Admin" items={adminNav} />}
      </SidebarContent>
      <SidebarFooter className="px-3 pb-3">
        <p className="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">
          {user?.subscription.planId
            ? `${user.subscription.planId.toUpperCase()} plan`
            : "KlearNote"}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
