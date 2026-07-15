"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UploadGate } from "@/lib/billing/entitlements";

/**
 * Shown in place of the dropzone when the user can't process a new track —
 * over their monthly cap, past due, or on a canceled plan. The reason + CTA
 * come straight from the `uploadGate` rule (lib/billing/entitlements).
 */
export function UploadGateNotice({
  gate,
}: {
  gate: Extract<UploadGate, { allowed: false }>;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <span className="bg-muted text-muted-foreground grid size-14 place-items-center rounded-full">
          <Lock className="size-6" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-medium">{gate.title}</p>
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">
            {gate.body}
          </p>
        </div>
        <Button asChild>
          <Link href={gate.cta.href}>{gate.cta.label}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
