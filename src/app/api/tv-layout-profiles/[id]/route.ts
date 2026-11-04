import { deleteTvLayoutProfile, getTvLayoutProfile, renameTvLayoutProfile } from "@/features/layout/store";
import { requireAdmin, requireSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };
const noStore = { "Cache-Control": "no-store" };

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: Ctx) {
  await requireSession();
  const id = parseId((await params).id);
  if (id === null) return Response.json({ error: "Preset tidak ditemukan" }, { status: 404, headers: noStore });
  try {
    const profile = await getTvLayoutProfile(id);
    return profile
      ? Response.json(profile, { headers: noStore })
      : Response.json({ error: "Preset tidak ditemukan" }, { status: 404, headers: noStore });
  } catch (error) {
    console.error("[tv-layout-profiles] Gagal memuat preset", error);
    return Response.json({ error: "Database tidak terjangkau" }, { status: 503, headers: noStore });
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (id === null) return Response.json({ error: "Preset tidak ditemukan" }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  const name = typeof body === "object" && body !== null && "name" in body && typeof body.name === "string"
    ? body.name.trim()
    : "";
  if (!name || name.length > 100) {
    return Response.json({ error: "Nama preset wajib diisi (maksimal 100 karakter)" }, { status: 422 });
  }
  try {
    const profile = await renameTvLayoutProfile(id, name);
    return profile
      ? Response.json(profile, { headers: noStore })
      : Response.json({ error: "Preset tidak ditemukan" }, { status: 404 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json({ error: "Nama preset sudah digunakan" }, { status: 409 });
    }
    console.error("[tv-layout-profiles] Gagal mengganti nama preset", error);
    return Response.json({ error: "Gagal mengganti nama preset" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (id === null) return Response.json({ error: "Preset tidak ditemukan" }, { status: 404 });
  try {
    const deleted = await deleteTvLayoutProfile(id);
    return deleted
      ? Response.json({ ok: true }, { headers: noStore })
      : Response.json({ error: "Preset tidak ditemukan" }, { status: 404 });
  } catch (error) {
    console.error("[tv-layout-profiles] Gagal menghapus preset", error);
    return Response.json({ error: "Gagal menghapus preset" }, { status: 503 });
  }
}
