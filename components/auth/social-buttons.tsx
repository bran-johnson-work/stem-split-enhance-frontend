"use client";

import { Button } from "@/components/ui/button";

/** Google's multi-colour "G" mark. lucide ships no brand logos. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.86-.08-1.69-.22-2.49H12v4.71h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.28a12 12 0 0 0 0 10.8l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.95 11.95 0 0 0 12 0 12 12 0 0 0 1.28 6.6l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

/**
 * Google sign-in button + an "or continue with email" divider. Shared by the
 * login and signup forms. The API doc exposes no OAuth endpoint, so the button
 * is disabled and marked "Soon" until Google sign-in ships on the backend.
 */
export function SocialButtons({
  label,
}: {
  label: string;
  /** Retained for call-site compatibility; unused while Google sign-in is deferred. */
  successMessage?: string;
}) {
  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled
        title="Google sign-in is coming soon"
      >
        <GoogleIcon className="size-4" />
        {label}
        <span className="bg-muted text-muted-foreground ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
          Soon
        </span>
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background text-muted-foreground px-2">
            or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}
