import type { User } from "../demo/types";

export async function loadCurrentUser(accessToken: string): Promise<User> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Your session expired. Please log in again.");
    if (response.status === 403) throw new Error("Your account has not been granted access. Contact the project administrator.");
    throw new Error("Account verification is unavailable. Please retry.");
  }
  const user = await response.json();
  if (typeof user.id !== "string" || typeof user.display_name !== "string" || typeof user.email !== "string"
      || !["player", "moderator"].includes(user.role)) throw new Error("Invalid account response.");
  return { id: user.id, name: user.display_name, email: user.email, role: user.role,
    joinedAt: user.created_at ? Date.parse(user.created_at) : undefined };
}
