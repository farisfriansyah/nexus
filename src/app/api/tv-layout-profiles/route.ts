import { createTvLayoutProfile, listTvLayoutProfiles } from "@/features/layout/store";
import { requireAdmin, requireSession } from "@/lib/auth/session";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  await requireSession();
  try {
    return Response.json(await listTvLayoutProfiles(), { headers: noStore });
  } catch {
    return Response.json({ error: "Database tidak terjangkau" }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  const body: unknown = await request.json().catch(() => null);
  const name = typeof body === "object" && body !== null && "name" in body && typeof body.name === "string"
    ? body.name.trim()
    : "";
  if (!name || name.length > 100) {
    return Response.json({ error: "Nama preset wajib diisi (maksimal 100 karakter)" }, { status: 422 });
  }
  try {
    const profile = await createTvLayoutProfile(name, session.user.email ?? null);
    return Response.json(profile, { status: 201, headers: noStore });
  } catch (error) {
    if (isUniqueConflict(error)) return Response.json({ error: "Nama preset sudah digunakan" }, { status: 409 });
    console.error("[tv-layout-profiles] Gagal membuat preset", error);
    return Response.json({ error: "Gagal membuat preset layout" }, { status: 503 });
  }
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
