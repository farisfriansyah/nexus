import { getTab } from "@/config/tabs";
import { getLayoutFromProfile, getTvLayoutProfile, saveProfileTabLayout, validateLayout } from "@/features/layout/store";
import { requireAdmin, requireSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string; tab: string }> };
const noStore = { "Cache-Control": "no-store" };

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: Ctx) {
  await requireSession();
  const { id: rawId, tab } = await params;
  const id = parseId(rawId);
  if (id === null || !getTab(tab)) return Response.json({ error: "Preset atau tab tidak ditemukan" }, { status: 404, headers: noStore });
  try {
    const profile = await getTvLayoutProfile(id);
    if (!profile) return Response.json({ error: "Preset tidak ditemukan" }, { status: 404, headers: noStore });
    const layout = getLayoutFromProfile(profile, tab);
    return layout
      ? Response.json({ layout, profile: { id: profile.id, name: profile.name } }, { headers: noStore })
      : Response.json({ error: "Layout tab tidak valid dalam preset" }, { status: 422, headers: noStore });
  } catch (error) {
    console.error("[tv-layout-profiles] Gagal memuat layout preset", error);
    return Response.json({ error: "Database tidak terjangkau" }, { status: 503, headers: noStore });
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  await requireAdmin();
  const { id: rawId, tab } = await params;
  const id = parseId(rawId);
  if (id === null || !getTab(tab)) return Response.json({ error: "Preset atau tab tidak ditemukan" }, { status: 404 });
  const checked = validateLayout(await request.json().catch(() => null), tab);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 422 });
  try {
    const saved = await saveProfileTabLayout(id, tab, checked.layout);
    return saved
      ? Response.json({ id, tab, status: "saved" }, { headers: noStore })
      : Response.json({ error: "Preset tidak ditemukan" }, { status: 404 });
  } catch (error) {
    console.error("[tv-layout-profiles] Gagal menyimpan layout preset", error);
    return Response.json({ error: "Gagal menyimpan layout preset" }, { status: 503 });
  }
}
