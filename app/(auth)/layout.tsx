import Image from "next/image";
import { Check } from "lucide-react";
import { FloatingIcons } from "@/components/auth/floating-icons";
import { Logo } from "@/components/shared/logo";

const HIGHLIGHTS = [
  "Separate vocals, drums & more — automatically",
  "One-click AI mastering",
  "Export-ready files in minutes",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background relative grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — desktop half. Background photo with a brand-tinted
          multiply (keeps the KlearNote red identity) over a dark gradient for
          legibility, with music icons drifting over it. `auth-panel-seam`
          feathers the right edge to transparent so it dissolves into the form
          column's background cleanly in both light and dark themes. */}
      <div className="auth-panel-seam relative hidden overflow-hidden lg:flex">
        <Image
          src="/auth-image.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="bg-brand-gradient absolute inset-0 opacity-50 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/45" />

        <FloatingIcons />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 text-white">
          {/* Theme-following brand ink: red on light, white in dark. Soft
              shadow lifts it off the photo — the red esp. needs the separation. */}
          <Logo
            href="/"
            variant="white"
            priority
            className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
          />

          <div className="space-y-8">
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-balance drop-shadow-md">
              Clean stems and a finished master — in minutes.
            </h2>
            <ul className="space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur-sm">
                    <Check className="size-3.5" />
                  </span>
                  <span className="text-sm text-white/90 drop-shadow">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/70 drop-shadow">
            © {new Date().getFullYear()} KlearNote.AI, Inc.
          </p>
        </div>
      </div>

      {/* Form area */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo for mobile, where the brand panel is hidden. */}
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
