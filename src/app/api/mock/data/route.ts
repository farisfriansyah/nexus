import { requireSession } from "@/lib/auth/session";

export async function GET() {
  await requireSession();
  return Response.json({ data: [], source: "mock", message: "Belum ada data bisnis." });
}
