import { getTab } from "@/config/tabs";
import { publishDraft } from "@/features/layout/store";
import { requireManagementAccess } from "@/lib/auth/session";

export async function POST(_request: Request, { params }: { params: Promise<{ tab: string }> }) {
  const session = await requireManagementAccess("layout.publish");
  const { tab } = await params;
  if (!getTab(tab)) return Response.json({ error: "Tab tidak ditemukan" }, { status: 404 });
  try {
    const version = await publishDraft(tab, session.user.email ?? null);
    if (version === null) return Response.json({ error: "Tidak ada draft untuk diterapkan" }, { status: 409 });
    return Response.json({ version, status: "published" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Database tidak terjangkau" }, { status: 503 });
  }
}
