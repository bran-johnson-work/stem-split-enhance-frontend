// Real project + file-upload calls against Dakota's API, plus the
// ProjectResponse → Project mapper shared with the HttpApi. These back the
// presigned upload flow: create-project → sign-per-file → POST to S3 →
// upload-complete.

import { apiFetch } from "@/lib/api/fetch";
import { apiUrl } from "@/lib/config";
import type { Project, ProjectInputFile, ProjectStatus } from "@/lib/types";

// ---- Backend response shapes (see docs/API doc.yaml) ----------------------

type BackendStatus =
  | "pending"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

interface ProjectFileResponse {
  id: string;
  original_filename: string;
  storage_key: string;
  file_size_bytes: number;
  content_type: string;
  created_at: string;
}

export interface ProjectResponse {
  id: string;
  user_id: string;
  name: string;
  status: BackendStatus;
  input_files: ProjectFileResponse[];
  created_at: string;
  updated_at: string;
}

/**
 * A presigned POST. The client sends `multipart/form-data` to `url` with every
 * `fields` entry appended *before* the `file` part; S3 enforces the policy's
 * size and content-type conditions itself and rejects violating uploads.
 */
export interface UploadUrlResponse {
  project_id: string;
  storage_key: string;
  url: string;
  fields: Record<string, string>;
}

// ---- Mapping --------------------------------------------------------------

/**
 * Collapse the backend's coarse lifecycle onto the app's finer `ProjectStatus`.
 * The backend reports no intra-processing stage or progress, so `processing`
 * lands on the first processing stage; the live-status hook (Phase 3) animates
 * the sub-stages on top of the authoritative status.
 */
function mapStatus(status: BackendStatus): ProjectStatus {
  switch (status) {
    case "pending":
    case "uploading":
    case "queued":
      return "queued";
    case "processing":
      return "analyzing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
  }
}

function progressFor(status: ProjectStatus): number {
  if (status === "completed") return 100;
  return 0;
}

export function mapProject(res: ProjectResponse): Project {
  const inputFiles: ProjectInputFile[] = res.input_files.map((f) => ({
    id: f.id,
    filename: f.original_filename,
    sizeBytes: f.file_size_bytes,
    contentType: f.content_type,
  }));
  const primary = inputFiles[0];
  const status = mapStatus(res.status);

  return {
    id: res.id,
    title: res.name,
    status,
    progress: progressFor(status),
    createdAt: res.created_at,
    updatedAt: res.updated_at,
    sourceFileName: primary?.filename ?? "",
    sourceSizeBytes: primary?.sizeBytes ?? 0,
    durationSec: 0, // backend doesn't expose duration yet
    stems: [],
    inputFiles,
  };
}

// ---- API calls ------------------------------------------------------------

/** Create an empty project (consumes monthly quota). */
export function createProject(name?: string): Promise<ProjectResponse> {
  return apiFetch<ProjectResponse>(apiUrl("/projects"), {
    method: "POST",
    json: name ? { name } : {},
  });
}

/**
 * Mint a presigned POST for a file in an existing project.
 *
 * `fileSizeBytes` is advisory: it lets the backend fail a too-large file with a
 * 413 *before* the bytes go over the wire. It is not trusted — the policy caps
 * the real transfer and `upload-complete` re-checks the stored object.
 */
export function signFileUpload(
  projectId: string,
  filename: string,
  contentType: string,
  fileSizeBytes?: number,
): Promise<UploadUrlResponse> {
  return apiFetch<UploadUrlResponse>(
    apiUrl(`/projects/${projectId}/files/upload-url`),
    {
      method: "POST",
      json: {
        filename,
        content_type: contentType,
        ...(fileSizeBytes ? { file_size_bytes: fileSizeBytes } : {}),
      },
    },
  );
}

/** Finalise the upload: verify the objects landed and move the project to queued. */
export function completeUpload(projectId: string): Promise<Project> {
  return apiFetch<ProjectResponse>(
    apiUrl(`/projects/${projectId}/upload-complete`),
    { method: "POST" },
  ).then(mapProject);
}

/** Fetch a single project (used for the detail view and status polling). */
export function getProject(id: string): Promise<Project> {
  return apiFetch<ProjectResponse>(apiUrl(`/projects/${id}`)).then(mapProject);
}

/**
 * List the caller's projects. The API returns a bare array (offset pagination via
 * skip/limit, no total, no search) — the HttpApi fetches a window and does search
 * + page slicing client-side, mirroring MockApi.
 */
export function listProjects(skip = 0, limit = 100): Promise<Project[]> {
  return apiFetch<ProjectResponse[]>(
    apiUrl(`/projects?skip=${skip}&limit=${limit}`),
  ).then((arr) => arr.map(mapProject));
}
