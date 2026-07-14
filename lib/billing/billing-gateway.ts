// BillingGateway seam. The billing UI (components/billing) is written against
// this contract and never knows *how* a card gets collected — an in-app form, a
// Stripe Elements iframe, or a redirect to Stripe Checkout. Mirrors the
// `Uploader` (lib/upload), `Downloader` (lib/download), `AudioSource` (lib/audio)
// and `AvatarStore` (lib/avatar) seams.
//
// Why a seam and not just an API call: the *payment method* is server state (the
// API owns `getPaymentMethod` / `attachPaymentMethod` / `removePaymentMethod`),
// but *collecting* the card is a transport concern the API never sees. Raw card
// numbers must not reach our backend — a real gateway tokenizes them in the
// browser and only the token crosses the wire. Splitting them here means the
// swap is local.
//
// DEFERRED: the API has no billing endpoints and there are no live Stripe keys,
// so the only implementation is simulated. When Stripe lands, add a
// `stripeGateway` (Elements or a Checkout redirect), gate it on USE_REAL_BACKEND
// below, and delete `simulatedGateway` + components/billing/card-dialog. Nothing
// else changes.

import type { CardToken } from "@/lib/types";
import { cardBrand, digitsOnly } from "@/lib/validations/billing";

export interface CardDetails {
  name: string;
  /** May contain the spaces the user typed; the gateway normalises. */
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  postalCode: string;
}

export interface BillingGateway {
  /**
   * Turn card details into an opaque token the API can attach to the customer.
   * Rejects with a user-facing message when the card is declined.
   */
  collectCard(details: CardDetails): Promise<CardToken>;
}

/** How long the simulated tokenization holds its pending state. */
const SIM_MS = 900;

/**
 * Stripe's canonical "card declined" test number. Kept as the error-state lever
 * for this screen, the same convention as `fail@klearnote.ai` (login) and
 * `wrongpassword` (change password).
 */
export const DECLINE_TEST_CARD = "4000000000000002";

export const simulatedGateway: BillingGateway = {
  async collectCard(details) {
    await new Promise((r) => setTimeout(r, SIM_MS));
    const number = digitsOnly(details.number);

    if (number === DECLINE_TEST_CARD) {
      throw new Error("Your card was declined. Try a different card.");
    }

    return {
      token: `pm_sim_${Date.now().toString(36)}`,
      brand: cardBrand(number),
      last4: number.slice(-4),
      expMonth: details.expMonth,
      expYear: details.expYear,
    };
  },
};

/** The active gateway — the single swap point. */
export const billingGateway: BillingGateway = simulatedGateway;

/** True when card collection is faked because no gateway is configured. */
export const IS_SIMULATED_GATEWAY = billingGateway === simulatedGateway;
