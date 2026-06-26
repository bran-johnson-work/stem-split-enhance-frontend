import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-white/15">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="1" y="6" width="2" height="4" rx="1" />
              <rect x="4.5" y="3.5" width="2" height="9" rx="1" />
              <rect x="8" y="1" width="2" height="14" rx="1" />
              <rect x="11.5" y="4.5" width="2" height="7" rx="1" />
            </svg>
          </span>
          KlearNote
        </Link>
        <blockquote className="space-y-2">
          <p className="text-2xl font-medium text-balance">
            “Upload a track, get clean stems and a finished master in minutes.”
          </p>
          <footer className="text-sm text-white/70">
            The KlearNote workflow
          </footer>
        </blockquote>
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} KlearNote.AI, Inc.
        </p>
      </div>

      {/* Form area */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
