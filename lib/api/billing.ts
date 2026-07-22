// Real billing calls against Dakota's API. Only invoices are wired here today:
// they are read live from Stripe (the system of record for receipts), so unlike
// plans/subscription there is no local copy to serve. The rest of the billing
// surface still runs on MockApi — see lib/api/http.ts.
//
// Real-only, like lib/api/jobs: the mock branch lives in MockApi and lib/api/index
// picks between the two. Callers go through the KlearNoteApi seam, not this module.

import { apiFetch } from "@/lib/api/fetch";
import { apiUrl } from "@/lib/config";
import type { Invoice } from "@/lib/types";

/** Shape of the API's InvoiceResponse (amounts already in dollars). */
interface InvoiceResponse {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

/** The API normalises to these three; anything else is treated as open. */
function mapStatus(status: string): Invoice["status"] {
  if (status === "paid" || status === "open" || status === "failed") return status;
  return "open";
}

function mapInvoice(res: InvoiceResponse): Invoice {
  return {
    id: res.id,
    date: res.created_at,
    amount: res.amount,
    status: mapStatus(res.status),
    // The direct PDF is what "Download" should hand the user; the hosted receipt
    // page is the fallback for the rare invoice with no rendered PDF yet.
    url: res.invoice_pdf ?? res.hosted_invoice_url ?? "",
    description: res.description ?? undefined,
  };
}

/** The caller's invoices, newest first. Empty for a user with no billing history. */
export async function listInvoices(): Promise<Invoice[]> {
  const invoices = await apiFetch<InvoiceResponse[]>(apiUrl("/billing/invoices"));
  return invoices.map(mapInvoice);
}
