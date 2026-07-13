import {
  ADMIN_USERS,
  CURRENT_USER,
  INVOICES,
  PLANS,
  PROJECTS,
} from "@/lib/mock/fixtures";
import type {
  AdminUserRow,
  ChangePasswordInput,
  CreateProjectInput,
  Invoice,
  Paginated,
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
  listInvoices(): Promise<Invoice[]>;
  adminListUsers(): Promise<AdminUserRow[]>;
  adminListProjects(): Promise<Project[]>;
}

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
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

  async listInvoices() {
    await delay(200);
    return clone(INVOICES);
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
