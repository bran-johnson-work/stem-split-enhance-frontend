import { AppSidebar } from "@/components/shared/app-sidebar";
import { MobileNavTrigger } from "@/components/shared/mobile-nav-trigger";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 px-4 backdrop-blur-md">
          {/* Mobile: logo mark opens the drawer. On desktop the collapse
              control lives on the sidebar itself. */}
          <MobileNavTrigger />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
