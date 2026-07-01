import {
  CreditCard,
  FolderClock,
  LayoutDashboard,
  ListMusic,
  Settings,
  Shield,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const marketingNav: { title: string; href: string }[] = [
  { title: "Features", href: "/#features" },
  { title: "How it works", href: "/#how-it-works" },
  { title: "Pricing", href: "/pricing" },
];

export const appNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Upload", href: "/upload", icon: Upload },
  { title: "Projects", href: "/projects", icon: FolderClock },
  { title: "Billing", href: "/billing", icon: CreditCard },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const adminNav: NavItem[] = [
  { title: "Overview", href: "/admin", icon: Shield },
  { title: "Projects", href: "/admin/projects", icon: ListMusic },
  { title: "Users", href: "/admin/users", icon: Users },
];
