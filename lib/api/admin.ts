// Admin statistics transport: GET /admin/stats/{overview,revenue,trends}. Like
// lib/api/projects and lib/api/users, this is real-only — the mock branch lives
// in MockApi and lib/api/index picks between them. Callers go through the
// KlearNoteApi seam, not this module. Wire shapes (snake_case, cents) never
// leave this file: the mappers convert to the app domain (camelCase, dollars).

import { apiFetch } from "@/lib/api/fetch";
import { apiUrl } from "@/lib/config";
import type {
  AdminOverview,
  AdminProject,
  AdminProjectStatus,
  AdminRevenue,
  AdminTrendPoint,
  AdminUser,
  UserRole,
} from "@/lib/types";

// The admin directory endpoints are read-only and unpaginated in the UI: we pull
// one server page (the backend caps `limit` at 200) and do search/filter/sort on
// the client. Bump to real pagination if user/project counts outgrow this.
const LIST_LIMIT = 200;

// --- Wire shapes -----------------------------------------------------------

interface OverviewResponse {
  users: { total: number; active: number; verified: number; admins: number };
  projects: { total: number; by_status: Record<string, number> };
  jobs: { total: number; by_status: Record<string, number> };
  subscriptions: {
    total: number;
    active: number;
    by_status: Record<string, number>;
  };
}

interface PlanRevenueResponse {
  plan_name: string;
  display_name: string;
  active_subscriptions: number;
  mrr_cents: number;
}

interface RevenueResponse {
  mrr_cents: number;
  arr_cents: number;
  active_paid_subscriptions: number;
  currency: string;
  by_plan: PlanRevenueResponse[];
}

interface TrendPointResponse {
  date: string;
  signups: number;
  projects_created: number;
}

interface TrendResponse {
  points: TrendPointResponse[];
}

interface AdminUserResponse {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminProjectResponse {
  id: string;
  user_id: string;
  owner_email: string;
  name: string;
  status: string;
  output_file_count: number;
  has_outputs: boolean;
  created_at: string;
  updated_at: string;
}

// --- Mappers ---------------------------------------------------------------

/** Cents (backend minor units) → whole dollars (what formatCurrency expects). */
const toDollars = (cents: number): number => cents / 100;

function mapOverview(res: OverviewResponse): AdminOverview {
  return {
    users: res.users,
    projects: { total: res.projects.total, byStatus: res.projects.by_status },
    jobs: { total: res.jobs.total, byStatus: res.jobs.by_status },
    subscriptions: {
      total: res.subscriptions.total,
      active: res.subscriptions.active,
      byStatus: res.subscriptions.by_status,
    },
  };
}

function mapRevenue(res: RevenueResponse): AdminRevenue {
  return {
    mrr: toDollars(res.mrr_cents),
    arr: toDollars(res.arr_cents),
    activePaidSubscriptions: res.active_paid_subscriptions,
    currency: res.currency,
    byPlan: res.by_plan.map((p) => ({
      planName: p.plan_name,
      displayName: p.display_name,
      activeSubscriptions: p.active_subscriptions,
      mrr: toDollars(p.mrr_cents),
    })),
  };
}

const mapTrends = (res: TrendResponse): AdminTrendPoint[] =>
  res.points.map((p) => ({
    date: p.date,
    signups: p.signups,
    projectsCreated: p.projects_created,
  }));

function mapUser(u: AdminUserResponse): AdminUser {
  return {
    id: u.id,
    // Same fallback the app-wide mapUser uses, so a nameless account still reads
    // as something human in the table.
    name: u.full_name?.trim() || u.email.split("@")[0],
    email: u.email,
    // The backend `UserRole` enum serializes uppercase ("ADMIN"/"USER"); the app
    // compares lowercase everywhere.
    role: u.role.toLowerCase() as UserRole,
    isActive: u.is_active,
    isVerified: u.is_verified,
    avatarUrl: u.avatar_url ?? undefined,
    createdAt: u.created_at,
  };
}

function mapProject(p: AdminProjectResponse): AdminProject {
  return {
    id: p.id,
    userId: p.user_id,
    ownerEmail: p.owner_email,
    name: p.name,
    // Backend `ProjectStatus` values are already lowercase; surface verbatim.
    status: p.status as AdminProjectStatus,
    outputFileCount: p.output_file_count,
    hasOutputs: p.has_outputs,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// --- Fetchers --------------------------------------------------------------

export function adminOverview(): Promise<AdminOverview> {
  return apiFetch<OverviewResponse>(apiUrl("/admin/stats/overview")).then(
    mapOverview,
  );
}

export function adminRevenue(): Promise<AdminRevenue> {
  return apiFetch<RevenueResponse>(apiUrl("/admin/stats/revenue")).then(
    mapRevenue,
  );
}

export function adminTrends(days: number): Promise<AdminTrendPoint[]> {
  return apiFetch<TrendResponse>(
    apiUrl(`/admin/stats/trends?days=${days}`),
  ).then(mapTrends);
}

export function adminListUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUserResponse[]>(
    apiUrl(`/admin/users?skip=0&limit=${LIST_LIMIT}`),
  ).then((rows) => rows.map(mapUser));
}

export function adminListProjects(): Promise<AdminProject[]> {
  return apiFetch<AdminProjectResponse[]>(
    apiUrl(`/admin/projects?skip=0&limit=${LIST_LIMIT}`),
  ).then((rows) => rows.map(mapProject));
}
