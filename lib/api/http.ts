// Real backend implementation of the KlearNoteApi contract. Wired to real
// endpoints: current user, project list/get/create, jobs, and invoices (read
// live from Stripe). The rest of billing (plans, subscription, payment method)
// and admin are still delegated to MockApi, so those screens keep working until
// their endpoints are wired. Swapped in for MockApi by lib/api/index.ts when
// NEXT_PUBLIC_API_URL is set.

import { getCurrentUser, requestEmailVerification } from "@/lib/api/auth";
import * as billingApi from "@/lib/api/billing";
import { MockApi, type KlearNoteApi } from "@/lib/api/client";
import * as jobsApi from "@/lib/api/jobs";
import * as projectsApi from "@/lib/api/projects";
import * as usersApi from "@/lib/api/users";
import { isTerminal, statusForProgress } from "@/lib/processing/pipeline";
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

/** Cap for the client-side search/pagination window (API has no search param). */
const LIST_WINDOW = 200;

export class HttpApi implements KlearNoteApi {
  // Fallback for endpoints the backend doesn't expose yet.
  private mock = new MockApi();

  getCurrentUser(): Promise<User> {
    return getCurrentUser();
  }

  // The API keys these off the user id, but the contract stays id-free — one
  // cheap GET /users/me beats leaking the id into every calling component.
  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const me = await getCurrentUser();

    const body: usersApi.UserUpdateBody = {};
    if (input.name !== undefined && input.name !== me.name) {
      body.full_name = input.name;
    }
    const email = input.email?.trim();
    const emailChanged = Boolean(
      email && email.toLowerCase() !== me.email.toLowerCase(),
    );
    if (emailChanged) body.email = email;

    let user = Object.keys(body).length
      ? await usersApi.updateUser(me.id, body)
      : me;

    // The AvatarStore seam has already persisted the image (server-side, via the
    // presigned-upload endpoints) and handed back its URL, so reflect it in the
    // user we return for an immediate cache update.
    if (input.avatarUrl !== undefined) {
      user = { ...user, avatarUrl: input.avatarUrl ?? undefined };
    }

    // A new address is unverified until the user confirms it, so kick off the
    // verification email the same way signup does.
    if (emailChanged && email) await requestEmailVerification(email);

    return user;
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    const me = await getCurrentUser();
    await usersApi.changePassword(me, input);
  }

  async deleteAccount(): Promise<void> {
    const me = await getCurrentUser();
    await usersApi.deleteUser(me.id);
  }

  async listProjects(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ProjectStatus[];
  }): Promise<Paginated<Project>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 10;
    const search = (params?.search ?? "").trim().toLowerCase();
    const status = params?.status;

    // The API has no search/status params, so we fetch a window and filter +
    // page-slice client-side — same discipline as the mock, keeping `total`
    // and pagination correct across the filtered set.
    const all = await projectsApi.listProjects(0, LIST_WINDOW);
    let filtered = all;
    if (status && status.length) {
      filtered = filtered.filter((p) => status.includes(p.status));
    }
    if (search) {
      filtered = filtered.filter((p) => p.title.toLowerCase().includes(search));
    }
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  /**
   * A project plus the live detail its own endpoint doesn't carry.
   *
   * `ProjectResponse` reports a coarse status and no progress at all, so the
   * detail view composes in the project's latest processing job (real progress
   * + the worker's current step) and, once that job is finished, its stems.
   * Doing it here means every consumer — the stepper, the progress bar, the
   * delivery panel — keeps reading a plain `Project` and needs no changes.
   *
   * Deliberately *not* done in `listProjects`: that would be one extra request
   * per row (N+1) to fill a progress bar the list only shows coarsely.
   */
  async getProject(id: string): Promise<Project> {
    const project = await projectsApi.getProject(id);

    // A project is job-less between upload-complete and the worker claiming it;
    // a missing job is normal, not an error, so it must not fail the detail view.
    const job = await jobsApi.getLatestJob(id).catch(() => null);
    if (!job) return project;

    const merged: Project = {
      ...project,
      progress: job.progress,
      currentStep: job.currentStep,
      // The project's own terminal status wins — it is the authoritative record
      // of completion. Mid-flight, the finer stage is derived from real progress
      // so the stepper advances instead of sitting on "analyzing".
      status: isTerminal(project.status)
        ? project.status
        : statusForProgress(job.progress),
      ...(job.errorMessage ? { error: job.errorMessage } : {}),
    };

    if (project.status !== "completed" || !job.isFinished) return merged;

    // Signed stem URLs are short-lived, so they're fetched only once the project
    // is complete — the point at which detail polling has already stopped.
    const stems = await jobsApi.getJobStems(id, job.id).catch(() => []);
    return stems.length ? { ...merged, stems } : merged;
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const name =
      input.title?.trim() ||
      input.sourceFileName.replace(/\.[^./\\]+$/, "") ||
      undefined;
    const res = await projectsApi.createProject(name);
    return projectsApi.mapProject(res);
  }

  // ---- Mostly mock — plans/subscription/payment method aren't wired yet ---
  // Invoices (below) are real; the rest of billing still runs on MockApi until
  // its endpoints are wired. Card *collection* is a separate concern — see the
  // BillingGateway seam in lib/billing/billing-gateway.ts.
  getPlans(): Promise<Plan[]> {
    return this.mock.getPlans();
  }
  getSubscription(): Promise<Subscription> {
    return this.mock.getSubscription();
  }
  changePlan(input: ChangePlanInput): Promise<Subscription> {
    return this.mock.changePlan(input);
  }
  cancelSubscription(): Promise<Subscription> {
    return this.mock.cancelSubscription();
  }
  resumeSubscription(): Promise<Subscription> {
    return this.mock.resumeSubscription();
  }
  // Invoices are real (read live from Stripe), even though the rest of billing
  // still runs on the mock — a paid user reaches this once they've checked out.
  listInvoices(): Promise<Invoice[]> {
    return billingApi.listInvoices();
  }
  getPaymentMethod(): Promise<PaymentMethod | null> {
    return this.mock.getPaymentMethod();
  }
  attachPaymentMethod(token: CardToken): Promise<PaymentMethod> {
    return this.mock.attachPaymentMethod(token);
  }
  removePaymentMethod(): Promise<void> {
    return this.mock.removePaymentMethod();
  }
  adminListUsers(): Promise<AdminUserRow[]> {
    return this.mock.adminListUsers();
  }
  adminListProjects(): Promise<Project[]> {
    return this.mock.adminListProjects();
  }
}
