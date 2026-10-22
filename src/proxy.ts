import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEV_LOGIN_COOKIE, isDevLoginEnabled } from "@/lib/auth/dev-login";

export default auth((request) => {
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_E2E_BYPASS === "1") {
    return NextResponse.next();
  }
  if (isDevLoginEnabled() && request.cookies.has(DEV_LOGIN_COOKIE)) return NextResponse.next();
  const isPrivate = /^\/(tv|analytics)(\/|$)/.test(request.nextUrl.pathname);
  if (isPrivate && !request.auth?.user?.email) {
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/tv/:path*", "/analytics/:path*"]
};
