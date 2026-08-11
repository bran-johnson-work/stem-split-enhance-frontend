import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const columns = [
  {
    heading: "Product",
    links: [
      { title: "Features", href: "/#features" },
      { title: "Live demo", href: "/demo" },
      { title: "Pricing", href: "/pricing" },
      { title: "Sign up", href: "/signup" },
    ],
  },
  {
    heading: "Company",
    links: [
      { title: "About", href: "#" },
      { title: "Blog", href: "#" },
      { title: "Contact", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { title: "Privacy", href: "#" },
      { title: "Terms", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-xs text-sm">
            Studio-grade stem separation and enhanced mastering for AI-generated
            audio.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.heading} className="space-y-3">
            <h3 className="text-sm font-semibold">{col.heading}</h3>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="text-muted-foreground mx-auto max-w-6xl px-4 py-6 text-xs sm:px-6">
          © {new Date().getFullYear()} KlearNote.AI, Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
