export type UserRole = "viewer" | "dev" | "admin";

export function parseUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") return null;
  const role = value.trim().toLowerCase();
  return role === "viewer" || role === "dev" || role === "admin" ? role : null;
}

export function hasManagementAccess(role: UserRole | null | undefined): boolean {
  return role === "dev" || role === "admin";
}
