// Real backend implementation of the KlearNoteApi contract. Only the endpoints
// Dakota's API actually exposes are wired here — current user, project list/get,
// and project create. Everything with no backend yet (plans, subscription,
// invoices, admin) is delegated to MockApi, so those screens keep working until
// their endpoints land. Swapped in for MockApi by lib/api/index.ts when
// NEXT_PUBLIC_API_URL is set.

import { getCurrentUser, requestEmailVerification } from "@/lib/api/auth";
import { MockApi, type KlearNoteApi } from "@/lib/api/client";
import * as projectsApi from "@/lib/api/projects";
import * as usersApi from "@/lib/api/users";
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

    // No avatar endpoint yet — the AvatarStore seam has already persisted the
    // image on the device, so just reflect it in the user we hand back.
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

  getProject(id: string): Promise<Project> {
    return projectsApi.getProject(id);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const name =
      input.title?.trim() ||
      input.sourceFileName.replace(/\.[^./\\]+$/, "") ||
      undefined;
    const res = await projectsApi.createProject(name);
    return projectsApi.mapProject(res);
  }

  // ---- No backend yet — delegate to the mock -----------------------------
  // Billing has no endpoints at all (no plans, subscription, invoices or
  // payment methods in the API spec) and no live Stripe keys, so the whole
  // surface runs on MockApi. Card *collection* is a separate concern — see the
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
  listInvoices(): Promise<Invoice[]> {
    return this.mock.listInvoices();
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
