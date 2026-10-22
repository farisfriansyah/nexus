import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { DEV_LOGIN_COOKIE, devSession, isDevLoginEnabled } from "@/lib/auth/dev-login";

export type UserRole = "viewer" | "admin";
export type AppSession = Session;

function isSession(value: unknown): value is AppSession {
  return typeof value === "object" && value !== null && "user" in value;
}

export async function requireSession(): Promise<AppSession> {
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_E2E_BYPASS === "1") {
    return { user: { name: "E2E Viewer", email: "viewer@mikatasa.com", role: "viewer" }, expires: "2099-01-01T00:00:00.000Z" };
  }
  if (isDevLoginEnabled() && (await cookies()).has(DEV_LOGIN_COOKIE)) return devSession;
  const result: unknown = await auth();
  if (!isSession(result) || !result.user?.email) redirect("/login");
  const session = result;
  return session;
}

export async function requireAdmin(): Promise<AppSession> {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/unauthorized");
  return session;
}
