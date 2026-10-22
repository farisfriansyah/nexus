"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { DEV_LOGIN_COOKIE, isDevLoginEnabled } from "@/lib/auth/dev-login";

export async function devLoginAction() {
  if (!isDevLoginEnabled()) redirect("/login?error=disabled");
  (await cookies()).set(DEV_LOGIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  redirect("/");
}

export async function signOutAction() {
  (await cookies()).delete(DEV_LOGIN_COOKIE);
  await signOut({ redirectTo: "/login" });
}
