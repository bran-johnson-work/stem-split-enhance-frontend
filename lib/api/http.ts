// Real backend implementation of the KlearNoteApi contract. Only the endpoints
// Dakota's API actually exposes are wired here — current user, project list/get,
// and project create. Everything with no backend yet (plans, subscription,
// invoices, admin) is delegated to MockApi, so those screens keep working until
// their endpoints land. Swapped in for MockApi by lib/api/index.ts when
// NEXT_PUBLIC_API_URL is set.

import { getCurrentUser } from "@/lib/api/auth";
import { MockApi, type KlearNoteApi } from "@/lib/api/client";
import * as projectsApi from "@/lib/api/projects";
import type {
  AdminUserRow,
  CreateProjectInput,
  Invoice,
  Paginated,
  Plan,
  Project,
  ProjectStatus,
  Subscription,
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
  getPlans(): Promise<Plan[]> {
    return this.mock.getPlans();
  }
  getSubscription(): Promise<Subscription> {
    return this.mock.getSubscription();
  }
  listInvoices(): Promise<Invoice[]> {
    return this.mock.listInvoices();
  }
  adminListUsers(): Promise<AdminUserRow[]> {
    return this.mock.adminListUsers();
  }
  adminListProjects(): Promise<Project[]> {
    return this.mock.adminListProjects();
  }
}
