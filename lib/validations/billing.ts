import { z } from "zod";
import type { CardBrand } from "@/lib/types";

/** Card number with the spaces/dashes people actually type stripped out. */
export const digitsOnly = (v: string) => v.replace(/[\s-]/g, "");

/**
 * Brand from the issuer prefix. Enough to pick the right label and icon — a real
 * gateway (Stripe Elements) does this itself and hands back the brand, so this
 * goes away with the simulated card form.
 */
export function cardBrand(number: string): CardBrand {
  const n = digitsOnly(number);
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  unknown: "Card",
};

/** "1234 5678 9012 3456" — grouped as you type. Amex groups 4-6-5. */
export function formatCardNumber(value: string): string {
  const n = digitsOnly(value).slice(0, 19);
  const groups =
    cardBrand(n) === "amex" ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const out: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= n.length) break;
    out.push(n.slice(i, i + size));
    i += size;
  }
  return out.join(" ");
}

/** "1225" → "12/25". */
export function formatExpiry(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 4);
  return n.length <= 2 ? n : `${n.slice(0, 2)}/${n.slice(2)}`;
}

/** Parse "MM/YY" into a 1-based month and a 4-digit year. */
export function parseExpiry(value: string): { month: number; year: number } | null {
  const match = /^(\d{2})\s*\/?\s*(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(match[2]) };
}

/** True once the card's expiry month has fully passed. */
function isExpired(month: number, year: number): boolean {
  const now = new Date();
  // A card is valid through the last day of its expiry month.
  return year < now.getFullYear() ||
    (year === now.getFullYear() && month < now.getMonth() + 1);
}

// Deliberately light: shape and expiry only, no Luhn check. With a real gateway
// the card never touches our form (PCI scope) — Stripe Elements owns the fields
// and the validation — so anything more here is work that gets deleted.
export const cardSchema = z.object({
  name: z.string().min(2, "Enter the name on the card"),
  number: z
    .string()
    .transform(digitsOnly)
    .refine((n) => /^\d{13,19}$/.test(n), "Enter a valid card number"),
  expiry: z
    .string()
    .refine((v) => parseExpiry(v) !== null, "Use MM/YY")
    .refine((v) => {
      const parsed = parseExpiry(v);
      return parsed ? !isExpired(parsed.month, parsed.year) : false;
    }, "That card has expired"),
  cvc: z.string().regex(/^\d{3,4}$/, "3 or 4 digits"),
  postalCode: z.string().min(3, "Enter your billing postcode"),
});

export type CardValues = z.infer<typeof cardSchema>;
