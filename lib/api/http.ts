

import * as adminApi from "@/lib/api/admin";
import { getCurrentUser, requestEmailVerification } from "@/lib/api/auth";
import * as billingApi from "@/lib/api/billing";
import { MockApi, type KlearNoteApi } from "@/lib/api/client";
import * as jobsApi from "@/lib/api/jobs";
import * as projectsApi from "@/lib/api/projects";
import * as usersApi from "@/lib/api/users";
import { isTerminal, statusForProgress } from "@/lib/processing/pipeline";
import type {
  AdminOverview,
  AdminProject,
  AdminRevenue,
  AdminTrendPoint,
  AdminUser,
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
  StemComparison,
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

  async getProject(id: string): Promise<Project> {
    const project = await projectsApi.getProject(id);


    const job = await jobsApi.getLatestJob(id).catch(() => null);
    if (!job) return project;

    const merged: Project = {
      ...project,
      progress: job.progress,
      currentStep: job.currentStep,
      status: isTerminal(project.status)
        ? project.status
        : statusForProgress(job.progress),
      ...(job.errorMessage ? { error: job.errorMessage } : {}),
    };

    if (project.status !== "completed" || !job.isFinished) return merged;

    const stems = await jobsApi.getJobStems(id, job.id).catch(() => []);
    return stems.length ? { ...merged, stems } : merged;
  }

  /**
   * Both engine versions' stems. Returns `null` when there is nothing to compare
   * — fewer than two versions have produced output — so the caller can hide the
   * compare UI rather than render a one-sided comparison. A project that predates
   * the v2 rollout reports exactly one version, which is the normal case.
   */
  async getStemsComparison(projectId: string): Promise<StemComparison | null> {
    const comparison = await jobsApi.getStemsComparison(projectId);
    return comparison.versions.length >= 2 ? comparison : null;
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const name =
      input.title?.trim() ||
      input.sourceFileName.replace(/\.[^./\\]+$/, "") ||
      undefined;
    const res = await projectsApi.createProject(name);
    return projectsApi.mapProject(res);
  }

  createEmptyProject(name: string): Promise<Project> {
    return projectsApi.createProject(name).then(projectsApi.mapProject);
  }


  getPlans(): Promise<Plan[]> {
    return billingApi.getPlans();
  }
  getSubscription(): Promise<Subscription> {
    return billingApi.getSubscription();
  }

  // In-app plan swap: prorated price change on the live Stripe subscription
  // (POST /billing/change-plan), not the mock — otherwise the cache is seeded
  // with mock state that a reload immediately contradicts with the real one.
  changePlan(input: ChangePlanInput): Promise<Subscription> {
    return billingApi.changePlan(input.planId, input.cycle);
  }
  cancelSubscription(): Promise<Subscription> {
    return billingApi.cancelSubscription();
  }
  // Undo a scheduled cancellation via the real endpoint (POST /billing/resume);
  // routing this to the mock left Stripe still set to cancel and made the UI
  // flip to the mock's free/"Trial" default until the next reload.
  resumeSubscription(): Promise<Subscription> {
    return billingApi.resumeSubscription();
  }
  startCheckout(input: ChangePlanInput): Promise<{ url: string }> {
    const interval = input.cycle;
    return billingApi
      .createCheckout(input.planId, interval)
      .then((url) => ({ url }));
  }
  openBillingPortal(): Promise<{ url: string }> {
    return billingApi.createPortalSession().then((url) => ({ url }));
  }
  // Invoices are real (read live from Stripe).
  listInvoices(): Promise<Invoice[]> {
    return billingApi.listInvoices();
  }

  getPaymentMethod(): Promise<PaymentMethod | null> {
    return Promise.resolve(null);
  }
  attachPaymentMethod(token: CardToken): Promise<PaymentMethod> {
    return this.mock.attachPaymentMethod(token);
  }
  removePaymentMethod(): Promise<void> {
    return this.mock.removePaymentMethod();
  }
  adminListUsers(): Promise<AdminUser[]> {
    return adminApi.adminListUsers();
  }
  adminListProjects(): Promise<AdminProject[]> {
    return adminApi.adminListProjects();
  }
  // Stats are real (aggregated server-side under GET /admin/stats/*).
  adminOverview(): Promise<AdminOverview> {
    return adminApi.adminOverview();
  }
  adminRevenue(): Promise<AdminRevenue> {
    return adminApi.adminRevenue();
  }
  adminTrends(days: number): Promise<AdminTrendPoint[]> {
    return adminApi.adminTrends(days);
  }
}
