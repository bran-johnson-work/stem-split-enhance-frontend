"use client";

import * as React from "react";
import { Download, LoaderCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import { InvoiceRowCard } from "@/components/billing/invoice-row-card";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadFile } from "@/lib/download/download-file";
import { formatCurrency, formatDate } from "@/lib/format";
import { useInvoices } from "@/lib/hooks/queries";
import type { Invoice } from "@/lib/types";

export function InvoicesCard() {
  const { data: invoices, isLoading, isError } = useInvoices();
  // One download at a time, so the pending state is a single id — same shape the
  // delivery panel uses for stems.
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function handleDownload(invoice: Invoice) {
    if (pendingId) return;
    // A finalised invoice always carries a PDF URL; guard the rare one that
    // doesn't so an anchor click can't fall back to "downloading" the page.
    if (!invoice.url) {
      toast.error("That invoice isn't available to download yet.");
      return;
    }
    setPendingId(invoice.id);
    try {
      // Invoices ride the same Downloader seam as stems and masters: simulated
      // with no backend, a real anchor download once the URLs resolve.
      await downloadFile({
        url: invoice.url,
        filename: `klearnote-invoice-${invoice.id}.pdf`,
      });
    } catch {
      toast.error("Couldn't download that invoice.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>
          Every charge on this account. Receipts are yours to keep.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && <InvoicesSkeleton />}

        {isError && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Couldn&apos;t load your invoices. Refresh to try again.
          </p>
        )}

        {invoices && invoices.length === 0 && <InvoicesEmpty />}

        {invoices && invoices.length > 0 && (
          <>
            {/* Desktop */}
            <div className="hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-transparent">
                      <TableCell className="text-muted-foreground pl-4 tabular-nums">
                        {formatDate(invoice.date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.description ?? "Subscription"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(invoice)}
                          disabled={Boolean(pendingId)}
                          aria-label={`Download invoice from ${formatDate(invoice.date)}`}
                        >
                          {pendingId === invoice.id ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Download aria-hidden />
                          )}
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="grid gap-3 md:hidden">
              {invoices.map((invoice) => (
                <InvoiceRowCard
                  key={invoice.id}
                  invoice={invoice}
                  pending={pendingId === invoice.id}
                  disabled={Boolean(pendingId)}
                  onDownload={() => handleDownload(invoice)}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InvoicesEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
      <div className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-xl">
        <Receipt className="size-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">No invoices yet</p>
        <p className="text-muted-foreground max-w-xs text-sm">
          Once you subscribe to a paid plan, every receipt shows up here.
        </p>
      </div>
    </div>
  );
}

function InvoicesSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}
