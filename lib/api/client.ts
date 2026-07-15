import { planChange, priceFor } from "@/lib/billing/plans";
import {
  ADMIN_USERS,
  BILLING_STATE,
  CURRENT_USER,
  INVOICES,
  PLANS,
  PROJECTS,
} from "@/lib/mock/fixtures";
import type {
  AdminUserRow,
  CardToken,
  ChangePasswordInput,
  ChangePlanInput,
  CreateProjectInput,
  Invoice,
  Paginated,
  PaymentMethod,
  Plan,
  Project,
  ProjectStatus,
  Subscription,
  UpdateProfileInput,
  User,
} from "@/lib/types";

/**
 * The contract every KlearNote API implementation must satisfy. Today only the
 * mock implementation exists; when the backend is ready, add a `HttpApi` that
 * implements this same interface and switch in lib/api/index.ts.
 */
export interface KlearNoteApi {
  getCurrentUser(): Promise<User>;
  updateProfile(input: UpdateProfileInput): Promise<User>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  deleteAccount(): Promise<void>;
  listProjects(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Restrict to these statuses (e.g. the "processing" group). Omit = all. */
    status?: ProjectStatus[];
  }): Promise<Paginated<Project>>;
  getProject(id: string): Promise<Project>;
  createProject(input: CreateProjectInput): Promise<Project>;
  getPlans(): Promise<Plan[]>;
  getSubscription(): Promise<Subscription>;
  /**
   * Switch plan and/or billing cycle. Upgrades bill immediately; downgrades are
   * scheduled for the end of the period the user has already paid for.
   */
  changePlan(input: ChangePlanInput): Promise<Subscription>;
  /** Schedule a cancellation for the end of the current period. */
  cancelSubscription(): Promise<Subscription>;
  /** Undo a scheduled cancellation or downgrade. */
  resumeSubscription(): Promise<Subscription>;
  listInvoices(): Promise<Invoice[]>;
  /** The card on file, or `null` when there isn't one. */
  getPaymentMethod(): Promise<PaymentMethod | null>;
  /** Attach a card collected by the BillingGateway (lib/billing), replacing any existing one. */
  attachPaymentMethod(token: CardToken): Promise<PaymentMethod>;
  removePaymentMethod(): Promise<void>;
  adminListUsers(): Promise<AdminUserRow[]>;
  adminListProjects(): Promise<Project[]>;
}

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const DAY = 24 * 60 * 60 * 1000;
const clone = <T>(v: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));

export class MockApi implements KlearNoteApi {
  async getCurrentUser() {
    await delay(200);
    return clone(CURRENT_USER);
  }

  async updateProfile(input: UpdateProfileInput) {
    await delay(400);
    // Mutate the fixture in place so the change survives client navigations —
    // same discipline as createProject below (resets on a full reload).
    if (input.name !== undefined) CURRENT_USER.name = input.name;
    if (input.email !== undefined) CURRENT_USER.email = input.email;
    if (input.avatarUrl !== undefined) {
      if (input.avatarUrl === null) delete CURRENT_USER.avatarUrl;
      else CURRENT_USER.avatarUrl = input.avatarUrl;
    }
    return clone(CURRENT_USER);
  }

  async changePassword(input: ChangePasswordInput) {
    await delay(600);
    // Demo hook for the error state, same convention as the fail@/taken@
    // addresses in lib/api/auth.
    if (input.currentPassword === "wrongpassword") {
      throw new Error("Current password is incorrect.");
    }
  }

  async deleteAccount() {
    await delay(600);
  }

  async listProjects(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ProjectStatus[];
  }) {
    await delay();
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 10;
    const search = (params?.search ?? "").trim().toLowerCase();
    const status = params?.status;
    let filtered = PROJECTS;
    if (status && status.length) {
      filtered = filtered.filter((p) => status.includes(p.status));
    }
    if (search) {
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(search),
      );
    }
    const start = (page - 1) * pageSize;
    return {
      items: clone(filtered.slice(start, start + pageSize)),
      total: filtered.length,
      page,
      pageSize,
    } satisfies Paginated<Project>;
  }

  async getProject(id: string) {
    await delay(250);
    const project = PROJECTS.find((p) => p.id === id);
    if (!project) throw new Error(`Project ${id} not found`);
    return clone(project);
  }

  async createProject(input: CreateProjectInput) {
    await delay(300);

    // Server-side cap, matching the real backend's 400 "Monthly project limit
    // reached (N)". This is the backstop behind the client upload gate
    // (lib/billing/entitlements.uploadGate) — it catches an over-limit upload
    // even if usage tips over mid-session, counted the same way as
    // lib/hooks/use-monthly-usage.
    const plan = PLANS.find((p) => p.id === CURRENT_USER.subscription.planId);
    if (plan && plan.uploadsPerMonth !== "unlimited") {
      const now = new Date();
      const usedThisMonth = PROJECTS.filter((p) => {
        const created = new Date(p.createdAt);
        return (
          created.getMonth() === now.getMonth() &&
          created.getFullYear() === now.getFullYear()
        );
      }).length;
      if (usedThisMonth >= plan.uploadsPerMonth) {
        throw new Error(`Monthly project limit reached (${plan.uploadsPerMonth}).`);
      }
    }

    const nowIso = new Date().toISOString();
    const title =
      input.title?.trim() ||
      input.sourceFileName.replace(/\.[^./\\]+$/, "") ||
      "Untitled track";
    const project: Project = {
      id: `p_${Date.now()}`,
      title,
      status: "queued",
      progress: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      sourceFileName: input.sourceFileName,
      sourceSizeBytes: input.sourceSizeBytes,
      durationSec: input.durationSec ?? 0,
      stems: [],
    };
    // Prepend to the in-memory fixture so the new track shows up in history
    // across client navigations (resets on a full page reload — mock only).
    PROJECTS.unshift(project);
    return clone(project);
  }

  async getPlans() {
    await delay(150);
    return clone(PLANS);
  }

  async getSubscription() {
    await delay(150);
    return clone(CURRENT_USER.subscription);
  }

  async changePlan({ planId, cycle }: ChangePlanInput) {
    await delay(700);
    const sub = CURRENT_USER.subscription;
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error("That plan doesn't exist.");
    if (planId !== "free" && !BILLING_STATE.paymentMethod) {
      throw new Error("Add a payment method before changing your plan.");
    }

    const change = planChange(sub, { planId, cycle });
    if (change === "none") return clone(sub);

    if (change === "downgrade") {
      // Park it — the user keeps what they paid for until the period ends.
      sub.scheduledChange = { planId, cycle };
      return clone(sub);
    }

    // An upgrade bills today, so the period restarts and an invoice lands now.
    sub.planId = planId;
    sub.cycle = cycle;
    sub.status = "active";
    sub.renewsAt = new Date(
      Date.now() + (cycle === "annual" ? 365 : 30) * DAY,
    ).toISOString();
    delete sub.scheduledChange;
    delete sub.cancelAtPeriodEnd;
    delete sub.trialEndsAt;

    INVOICES.unshift({
      id: `in_${Date.now().toString(36)}`,
      date: new Date().toISOString(),
      amount: priceFor(plan, cycle),
      status: "paid",
      description: `${plan.name} — ${cycle}`,
      url: "#",
    });
    return clone(sub);
  }

  async cancelSubscription() {
    await delay(600);
    const sub = CURRENT_USER.subscription;
    sub.cancelAtPeriodEnd = true;
    // A pending downgrade is moot once the whole subscription is ending.
    delete sub.scheduledChange;
    return clone(sub);
  }

  async resumeSubscription() {
    await delay(500);
    const sub = CURRENT_USER.subscription;
    delete sub.cancelAtPeriodEnd;
    delete sub.scheduledChange;
    return clone(sub);
  }

  async listInvoices() {
    await delay(200);
    return clone(INVOICES);
  }

  async getPaymentMethod() {
    await delay(200);
    return clone(BILLING_STATE.paymentMethod);
  }

  async attachPaymentMethod(token: CardToken) {
    await delay(400);
    // A real gateway would hand the token to the API and the card metadata would
    // come back from the customer record; here the token carries it.
    const method: PaymentMethod = {
      id: token.token,
      brand: token.brand,
      last4: token.last4,
      expMonth: token.expMonth,
      expYear: token.expYear,
    };
    BILLING_STATE.paymentMethod = method;
    return clone(method);
  }

  async removePaymentMethod() {
    await delay(400);
    BILLING_STATE.paymentMethod = null;
  }

  async adminListUsers() {
    await delay(300);
    return clone(ADMIN_USERS);
  }

  async adminListProjects() {
    await delay(300);
    return clone(PROJECTS);
  }
}
