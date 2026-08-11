import {
  CreditCard,
  FolderClock,
  LayoutDashboard,
  ListMusic,
  Settings,
  Shield,
  Upload,
  Users,
  Waves,
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
  // The end-to-end pipeline demo. Sits next to Upload because that is the flow it
  // mirrors — one file through the real presigned-upload path, pinned to engine v3.
  // NOTE: the public `/demo` slug is taken by the marketing page that embeds the
  // Streamlit POC; this is the signed-in, real-backend version.
  // The demo: one track through the V2+V3 restoration pipeline, run on a separate
  // GPU service. Labelled "Demo" because it is what we show people, but the route
  // stays /restoration — the public marketing page owns the /demo slug, and two
  // different pages on one URL depending on a session cookie is impossible to
  // reason about.
  { title: "Demo", href: "/restoration", icon: Waves },
  { title: "Billing", href: "/billing", icon: CreditCard },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const adminNav: NavItem[] = [
  { title: "Overview", href: "/admin", icon: Shield },
  { title: "Projects", href: "/admin/projects", icon: ListMusic },
  { title: "Users", href: "/admin/users", icon: Users },
];
