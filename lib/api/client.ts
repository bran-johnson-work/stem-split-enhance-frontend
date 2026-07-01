import {
  ADMIN_USERS,
  CURRENT_USER,
  INVOICES,
  PLANS,
  PROJECTS,
} from "@/lib/mock/fixtures";
import type {
  AdminUserRow,
  Invoice,
  Paginated,
  Plan,
  Project,
  Subscription,
  User,
} from "@/lib/types";

/**
 * The contract every KlearNote API implementation must satisfy. Today only the
 * mock implementation exists; when the backend is ready, add a `HttpApi` that
 * implements this same interface and switch in lib/api/index.ts.
 */
export interface KlearNoteApi {
  getCurrentUser(): Promise<User>;
  listProjects(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<Paginated<Project>>;
  getProject(id: string): Promise<Project>;
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

  async listProjects(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    await delay();
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 10;
    const search = (params?.search ?? "").trim().toLowerCase();
    const filtered = search
      ? PROJECTS.filter((p) => p.title.toLowerCase().includes(search))
      : PROJECTS;
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
