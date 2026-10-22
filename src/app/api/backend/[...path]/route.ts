import { env } from "@/lib/env";
import { requireSession } from "@/lib/auth/session";

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: RouteContext) {
  await requireSession();
  if (!env.API_BASE_URL) {
    return Response.json({ error: "Backend API_BASE_URL is not configured." }, { status: 503 });
  }
  const { path } = await params;
  const safePath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const target = new URL(safePath, `${env.API_BASE_URL.replace(/\/+$/, "")}/`);
  target.search = new URL(request.url).search;
  const upstream = await fetch(target, {
    headers: { accept: request.headers.get("accept") ?? "application/json" },
    cache: "no-store"
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store"
    }
  });
}
