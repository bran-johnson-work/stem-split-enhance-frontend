// Per-batch upload orchestration (product decision: one project per batch). All
// files uploaded in a session go into a single project:
//   create project (once, lazily) → sign + POST each file to S3 → upload-complete (once).
//
// Env-gated: with a backend it runs the real 4-step flow against Dakota's API;
// without one it simulates transfers and builds a mock project. Either way it
// exposes the same `Uploader` the queue consumes, plus a `finalize()` the batch
// hook calls when the queue drains. Both finalize paths are idempotent so a
// re-drain (e.g. after a retry) refreshes the same project rather than duplicating.

import * as projectsApi from "@/lib/api/projects";
import { USE_REAL_BACKEND } from "@/lib/config";
import { PROJECTS } from "@/lib/mock/fixtures";
import {
  abortError,
  simulatedUploader,
  xhrUploadPost,
  type Uploader,
} from "@/lib/upload/upload-file";
import type { Project, ProjectInputFile } from "@/lib/types";
import { audioContentType } from "@/lib/validations/upload";

export interface UploadBatch {
  /** Project-aware per-file uploader handed to the queue. */
  uploader: Uploader;
  /** Finalise the batch into a Project. Idempotent; call once the queue drains. */
  finalize: () => Promise<Project>;
  /** Whether any file has started uploading (a project exists / is pending). */
  hasProject: () => boolean;
}

export function createUploadBatch(): UploadBatch {
  return USE_REAL_BACKEND ? realBatch() : mockBatch();
}

function deriveTitle(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "") || "Untitled track";
}

// ---- Real backend: create → sign → PUT → complete -------------------------

function realBatch(): UploadBatch {
  // Memoised so the batch's files share one project. Reset on failure so a retry
  // re-attempts creation rather than reusing a rejected promise.
  let projectPromise: Promise<string> | null = null;

  const ensureProject = (file: File): Promise<string> => {
    if (!projectPromise) {
      projectPromise = projectsApi
        .createProject(deriveTitle(file.name))
        .then((p) => p.id)
        .catch((err) => {
          projectPromise = null;
          throw err;
        });
    }
    return projectPromise;
  };

  const uploader: Uploader = async (file, { onProgress, signal }) => {
    if (signal.aborted) throw abortError();
    const projectId = await ensureProject(file);
    if (signal.aborted) throw abortError();

    // The declared content type is signed into the policy, so S3 will reject the
    // POST unless the `Content-Type` field we send back matches it exactly.
    const signed = await projectsApi.signFileUpload(
      projectId,
      file.name,
      audioContentType(file),
      file.size,
    );
    if (signal.aborted) throw abortError();

    return xhrUploadPost(signed.url, signed.fields, signed.storage_key, file, {
      onProgress,
      signal,
    });
  };

  const finalize = async (): Promise<Project> => {
    if (!projectPromise) throw new Error("No project to finalise.");
    const projectId = await projectPromise;
    return projectsApi.completeUpload(projectId);
  };

  return { uploader, finalize, hasProject: () => projectPromise !== null };
}

// ---- Mock: simulated transfer + fixture project ---------------------------

function mockBatch(): UploadBatch {
  const uploaded: File[] = [];
  let project: Project | null = null;

  const uploader: Uploader = async (file, handlers) => {
    const result = await simulatedUploader(file, handlers);
    uploaded.push(file);
    return result;
  };

  const finalize = async (): Promise<Project> => {
    if (uploaded.length === 0) throw new Error("No files uploaded.");
    if (!project) {
      project = buildMockProject(uploaded);
      PROJECTS.unshift(project);
    } else {
      // Idempotent refresh: keep id/createdAt, update files in place.
      Object.assign(
        project,
        buildMockProject(uploaded, project.id, project.createdAt),
      );
    }
    return { ...project };
  };

  return { uploader, finalize, hasProject: () => uploaded.length > 0 };
}

function buildMockProject(
  files: File[],
  id?: string,
  createdAt?: string,
): Project {
  const nowIso = new Date().toISOString();
  const inputFiles: ProjectInputFile[] = files.map((f, i) => ({
    id: `${id ?? "f"}_${i}`,
    filename: f.name,
    sizeBytes: f.size,
    contentType: f.type || "audio/mpeg",
  }));
  const primary = files[0];
  return {
    id: id ?? `p_${Date.now()}`,
    title: deriveTitle(primary.name),
    status: "queued",
    progress: 0,
    createdAt: createdAt ?? nowIso,
    updatedAt: nowIso,
    sourceFileName: primary.name,
    sourceSizeBytes: primary.size,
    durationSec: 0,
    stems: [],
    inputFiles,
  };
}
