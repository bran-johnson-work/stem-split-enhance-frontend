import { AppSidebar } from "@/components/shared/app-sidebar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "@/components/shared/user-menu";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
          {/* Mobile opens the drawer here; on desktop the collapse control
              lives on the sidebar itself. */}
          <SidebarTrigger className="md:hidden" />
          <Separator orientation="vertical" className="mr-1 h-5 md:hidden" />
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
