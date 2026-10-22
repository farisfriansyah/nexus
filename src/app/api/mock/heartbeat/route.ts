import { requireSession } from "@/lib/auth/session";

export async function GET() {
  await requireSession();
  return Response.json({ type: "heartbeat", at: new Date().toISOString() }, {
    headers: { "Cache-Control": "no-store" }
  });
}
