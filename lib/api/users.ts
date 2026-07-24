// Real account calls against Dakota's API — profile update, password change and
// account deletion (PATCH/DELETE /users/{id}). Real-only, like lib/api/projects:
// the mock branch of these operations lives in MockApi, and lib/api/index picks
// between the two. Callers go through the KlearNoteApi seam, not this module.

import { login, mapUser, type UserResponse } from "@/lib/api/auth";
import { apiFetch } from "@/lib/api/fetch";
import { setRefreshToken, setToken } from "@/lib/auth/token";
import { apiUrl } from "@/lib/config";
import type { ChangePasswordInput, User } from "@/lib/types";

/** The API's UserUpdate body — every field optional, only what's sent changes. */
export interface UserUpdateBody {
  full_name?: string;
  email?: string;
  password?: string;
}

export async function updateUser(
  id: string,
  body: UserUpdateBody,
): Promise<User> {
  const res = await apiFetch<UserResponse>(apiUrl(`/users/${id}`), {
    method: "PATCH",
    json: body,
  });
  return mapUser(res);
}

/** Delete an account. Cascades to the user's projects and storage server-side. */
export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(apiUrl(`/users/${id}`), { method: "DELETE" });
}

/** A presigned POST for uploading a new avatar image directly to S3. */
interface AvatarUploadUrlResponse {
  storage_key: string;
  url: string;
  fields: Record<string, string>;
}

/** Request a presigned POST to upload a new avatar of the given content type. */
export function requestAvatarUploadUrl(
  contentType: string,
): Promise<AvatarUploadUrlResponse> {
  return apiFetch<AvatarUploadUrlResponse>(
    apiUrl("/users/me/avatar/upload-url"),
    { method: "POST", json: { content_type: contentType } },
  );
}

/** Finalise the avatar upload; returns the updated user (with the signed URL). */
export function completeAvatarUpload(): Promise<User> {
  return apiFetch<UserResponse>(apiUrl("/users/me/avatar/complete"), {
    method: "POST",
  }).then(mapUser);
}

/** Remove the current user's avatar; returns the updated user. */
export function deleteAvatar(): Promise<User> {
  return apiFetch<UserResponse>(apiUrl("/users/me/avatar"), {
    method: "DELETE",
  }).then(mapUser);
}

/**
 * Change the password of the signed-in user.
 *
 * The API has no "verify my password" endpoint, and PATCH /users/{id} replaces
 * the password with no check at all — so the current-password field would be
 * decorative if we only sent the patch. Instead:
 *
 *   1. verify the current password by re-running the OAuth2 password grant
 *      (a 401 there means it's wrong),
 *   2. patch the new password,
 *   3. log in again with the new password and store the fresh token.
 *
 * Step 3 is what keeps the session alive: whether or not the backend revokes
 * existing tokens on a password change, the token we hold afterwards is known
 * good — otherwise the user's next request could 401 out of nowhere.
 */
export async function changePassword(
  user: Pick<User, "id" | "email">,
  { currentPassword, newPassword }: ChangePasswordInput,
): Promise<void> {
  try {
    await login({
      email: user.email,
      password: currentPassword,
      remember: false,
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 400 || status === 401) {
      throw new Error("Current password is incorrect.");
    }
    throw err; // network/server failure — surface it as-is
  }

  await updateUser(user.id, { password: newPassword });

  const session = await login({
    email: user.email,
    password: newPassword,
    remember: false,
  });
  setToken(session.accessToken);
  // The re-login issued a fresh refresh token; keeping the old one would leave
  // the session unable to renew once this access token expires.
  if (session.refreshToken) setRefreshToken(session.refreshToken);
}
