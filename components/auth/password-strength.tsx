"use client";

import { cn } from "@/lib/utils";

function score(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const colors = [
  "bg-failed",
  "bg-failed",
  "bg-mastering",
  "bg-analyzing",
  "bg-completed",
];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const s = score(value);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < s ? colors[s] : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">{labels[s]}</p>
    </div>
  );
}
