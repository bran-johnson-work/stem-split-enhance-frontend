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

export interface Subscription {
  planId: PlanId;
  status: "trialing" | "active" | "past_due" | "canceled";
  renewsAt: string;
  trialEndsAt?: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "open" | "failed";
  url: string;
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
