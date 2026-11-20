import { handlers } from "@/auth";
import { recordSecurityAudit } from "@/lib/audit";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const isGoogleCallback = new URL(request.url).pathname.endsWith("/callback/google");
  let response: Response;
  try {
    response = await handlers.GET(request);
  } catch (error) {
    if (isGoogleCallback) {
      await recordSecurityAudit({ action: "auth.failed", target: "google", details: { reason: "oauth_callback" } });
    }
    throw error;
  }
  if (isGoogleCallback) {
    const location = response.headers.get("location");
    const error = location ? new URL(location, request.url).searchParams.get("error") : null;
    if ((error && error !== "domain") || response.status >= 400) {
      await recordSecurityAudit({ action: "auth.failed", target: "google", details: { reason: "oauth_callback" } });
    }
  }
  return response;
}

export const POST = handlers.POST;
