"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { DEV_LOGIN_COOKIE, devSession, isDevLoginEnabled } from "@/lib/auth/dev-login";
import { recordLogin } from "@/lib/auth/login-log";

export async function devLoginAction() {
  if (!isDevLoginEnabled()) redirect("/login?error=disabled");
  (await cookies()).set(DEV_LOGIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  try {
    await recordLogin({
      ...devSession.user,
      provider: "dev",
      userAgent: (await headers()).get("user-agent")
    });
  } catch (error) {
    console.error("[login-log] Gagal mencatat login pengembangan", error);
  }
  redirect("/");
}

export async function signOutAction() {
  (await cookies()).delete(DEV_LOGIN_COOKIE);
  await signOut({ redirectTo: "/login" });
}
