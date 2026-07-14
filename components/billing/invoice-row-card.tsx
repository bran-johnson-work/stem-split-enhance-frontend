"use client";

import { Download, LoaderCircle } from "lucide-react";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

/**
 * Mobile-friendly invoice row. Renders below `md` in place of the table — the
 * same split ProjectsTable / ProjectRowCard use on the history screen.
 */
export function InvoiceRowCard({
  invoice,
  pending,
  disabled,
  onDownload,
}: {
  invoice: Invoice;
  pending: boolean;
  disabled: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium tabular-nums">
            {formatCurrency(invoice.amount)}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {invoice.description ?? "Subscription"} · {formatDate(invoice.date)}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} className="shrink-0" />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full"
        onClick={onDownload}
        disabled={pending || disabled}
        aria-label={`Download invoice from ${formatDate(invoice.date)}`}
      >
        {pending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Download aria-hidden />
        )}
        Download
      </Button>
    </div>
  );
}
