import { getTab } from "@/config/tabs";
import { getEditableLayout, getPublishedLayout, resetLayout, saveDraft, validateLayout } from "@/features/layout/store";
import { requireAdmin, requireSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ tab: string }> };
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request, { params }: Ctx) {
  await requireSession();
  const { tab } = await params;
  if (!getTab(tab)) return Response.json({ error: "Tab tidak ditemukan" }, { status: 404 });
  const wantsDraft = new URL(request.url).searchParams.get("draft") === "1";
  const loaded = wantsDraft ? await getEditableLayout(tab).catch(() => getPublishedLayout(tab)) : await getPublishedLayout(tab);
  return Response.json(loaded, { headers: noStore });
}

export async function PUT(request: Request, { params }: Ctx) {
  const session = await requireAdmin();
  const { tab } = await params;
  if (!getTab(tab)) return Response.json({ error: "Tab tidak ditemukan" }, { status: 404 });
  const checked = validateLayout(await request.json().catch(() => null), tab);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 422 });
  try {
    const version = await saveDraft(tab, checked.layout, session.user.email ?? null);
    return Response.json({ version, status: "draft" }, { headers: noStore });
  } catch {
    return Response.json({ error: "Database tidak terjangkau" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  await requireAdmin();
  const { tab } = await params;
  if (!getTab(tab)) return Response.json({ error: "Tab tidak ditemukan" }, { status: 404 });
  try {
    await resetLayout(tab);
    return Response.json({ ok: true }, { headers: noStore });
  } catch {
    return Response.json({ error: "Database tidak terjangkau" }, { status: 503 });
  }
}
