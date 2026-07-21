// Domain model for KlearNote MVP v1. Shapes mirror what the backend (Dakota)
// is expected to provide; the mock API in lib/api conforms to these so the
// real client can be dropped in later with zero component changes.

export type ProjectStatus =
  | "queued"
  | "analyzing"
  | "separating"
  | "cleaning"
  | "mastering"
  | "completed"
  | "failed";

export const PROCESSING_STATES: ProjectStatus[] = [
  "queued",
  "analyzing",
  "separating",
  "cleaning",
  "mastering",
  "completed",
];

export type StemKind = "vocals" | "drums" | "bass" | "other" | "master";

export interface Stem {
  id: string;
  name: string;
  kind: StemKind;
  url: string;
  sizeBytes: number;
  durationSec: number;
}

// One uploaded source file within a project. A project may hold several (a batch
// upload) — mirrors the backend's `input_files[]`.
export interface ProjectInputFile {
  id: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  progress: number; // 0..100
  createdAt: string; // ISO
  updatedAt: string; // ISO
  sourceFileName: string; // primary (first) input file — kept for existing single-file UI
  sourceSizeBytes: number;
  durationSec: number;
  stems: Stem[];
  inputFiles?: ProjectInputFile[]; // all uploaded source files (batch)
  masterUrl?: string;
  error?: string;
  // The worker's own label for the step in flight, e.g. "Separating stems
  // (2/4 models)". Only present on a detail fetch against a real backend, where
  // it is composed in from the project's latest processing job.
  currentStep?: string;
}

// Payload for creating a project once its source file has been uploaded.
export interface CreateProjectInput {
  sourceFileName: string;
  sourceSizeBytes: number;
  title?: string;
  storagePath?: string;
  durationSec?: number;
}

export type PlanId = "free" | "creator" | "pro" | "studio";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  uploadsPerMonth: number | "unlimited";
}

export type BillingCycle = "monthly" | "annual";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export interface Subscription {
  planId: PlanId;
  status: SubscriptionStatus;
  cycle: BillingCycle;
  renewsAt: string;
  trialEndsAt?: string;
  /** Cancelled, but still active until `renewsAt` — "cancel anytime" keeps the
   *  period you paid for. Undone by `resumeSubscription`. */
  cancelAtPeriodEnd?: boolean;
  /** A downgrade doesn't take effect until the period ends, so the plan the user
   *  picked is parked here while `planId` stays what they're paying for today. */
  scheduledChange?: { planId: PlanId; cycle: BillingCycle };
}

/** What the user is switching to. */
export interface ChangePlanInput {
  planId: PlanId;
  cycle: BillingCycle;
}

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export interface PaymentMethod {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number; // 1..12
  expYear: number; // 4-digit
}

/**
 * A collected card, produced by the `BillingGateway` (lib/billing) and handed to
 * `attachPaymentMethod`. Stands in for a Stripe PaymentMethod id: with a real
 * gateway only `token` would cross the wire and the card metadata would come
 * back from the API — the display fields ride along because nothing else knows
 * them while the gateway is simulated.
 */
export interface CardToken {
  token: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "open" | "failed";
  url: string;
  /** What was billed, e.g. "Pro — monthly". */
  description?: string;
}

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  subscription: Subscription;
}

// Partial profile update. Only the fields present are changed — mirrors the
// backend's `UserUpdate` (PATCH /users/{id}). `avatarUrl: null` clears the avatar.
export interface UpdateProfileInput {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// Email notification opt-ins. No backend yet — persisted client-side by
// lib/preferences/preferences-store.
export interface NotificationPrefs {
  processingComplete: boolean;
  processingFailed: boolean;
  productUpdates: boolean;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  planId: PlanId;
  projectCount: number;
  status: "active" | "suspended";
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
