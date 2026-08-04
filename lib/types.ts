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

// --- Engine versions and the v1/v2 comparison ------------------------------
// The backend runs two separation engines against one queue (`v1` = HT-Demucs,
// `v2` = Mel-Band RoFormer vocals). While the v2 rollout is staged, a project can
// hold output from both, and the compare screen plays them against each other.

export type EngineVersion = "v1" | "v2";

/**
 * How one version's render is doing. A discriminated state rather than a pair of
 * booleans: v2 takes roughly twice as long as v1, so "still rendering" is a normal
 * thing to show next to a finished version, not an error.
 */
export type VersionState = "completed" | "processing" | "failed";

/** One engine version's output for a project. */
export interface VersionOutput {
  version: EngineVersion;
  jobId: string;
  state: VersionState;
  /**
   * Keyed by the backend's raw stem name (`vocals`, `hihats`, …), which is what
   * pairs a v1 row with its v2 counterpart. `Stem.id` embeds the job id, so it is
   * unique per version and useless for matching across them.
   */
  stems: Record<string, Stem>;
  /** What this run actually used, for the "how was this made" disclosure. */
  config: EngineRunConfig | null;
}

/**
 * The subset of `processing_jobs.engine_config` worth showing. The backend records
 * more; these are the dials that explain an audible difference between two runs.
 */
export interface EngineRunConfig {
  vocalsModel?: string;
  rhythmModel?: string;
  enhancementLevel?: string;
  overlap?: number;
  shifts?: number;
}

/** Both versions plus the union of stems either of them produced. */
export interface StemComparison {
  /**
   * Every stem name across both versions, in display order. The union matters:
   * the versions use different models, so the backend's content gate can keep a
   * quiet stem in one and drop it from the other. A row missing from one side is
   * a real answer that has to be shown, not a gap to hide.
   */
  stemNames: string[];
  versions: VersionOutput[];
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
  /** Per-file upload ceiling in MB, from the plan (free 20 → studio 500). */
  maxFileSizeMb: number;
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

// A user row for the admin directory. Mirrors the backend `UserResponse` (GET
// /admin/users) — the admin API is read-only, so there is no plan/project-count
// join here; `isActive`/`isVerified` are the account-state flags the backend
// actually exposes.
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

// The backend project lifecycle (raw `ProjectStatus` enum values). Distinct from
// the app's finer client-side `ProjectStatus` — the admin monitor shows the
// authoritative server status verbatim, no collapsing.
export type AdminProjectStatus =
  | "pending"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

// Admin-facing view of any project (GET /admin/projects). Carries the owner's
// email and output availability, which a normal project response does not.
export interface AdminProject {
  id: string;
  userId: string;
  ownerEmail: string;
  name: string;
  status: AdminProjectStatus;
  outputFileCount: number;
  hasOutputs: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Admin dashboard statistics -------------------------------------------
// Platform-wide aggregates from GET /admin/stats/*. Money is in whole dollars
// (major units) to match formatCurrency — the backend sends cents and the
// mapper in lib/api/admin divides by 100. `byStatus` is keyed by the backend's
// lowercase status values, every status present (zero-filled server-side).

export interface AdminOverview {
  users: { total: number; active: number; verified: number; admins: number };
  projects: { total: number; byStatus: Record<string, number> };
  jobs: { total: number; byStatus: Record<string, number> };
  subscriptions: { total: number; active: number; byStatus: Record<string, number> };
}

export interface AdminPlanRevenue {
  planName: string;
  displayName: string;
  activeSubscriptions: number;
  mrr: number; // dollars
}

export interface AdminRevenue {
  mrr: number; // dollars
  arr: number; // dollars
  activePaidSubscriptions: number;
  currency: string;
  byPlan: AdminPlanRevenue[];
}

export interface AdminTrendPoint {
  date: string; // ISO calendar date, YYYY-MM-DD
  signups: number;
  projectsCreated: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
