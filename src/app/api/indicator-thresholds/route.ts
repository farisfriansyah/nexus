import { getIndicator } from "@/config/ops-eng/indicators";
import { listIndicatorThresholds, saveIndicatorThreshold } from "@/features/indicator-thresholds/store";
import { validateIndicatorBands } from "@/features/indicator-thresholds/schema";
import { requireAdmin, requireSession } from "@/lib/auth/session";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  await requireSession();
  try {
    const indicators = await listIndicatorThresholds();
    return Response.json({
      indicators: indicators.map((entry) => {
        const definition = getIndicator(entry.key);
        return { ...entry, name: definition.name, unit: definition.unit, decimals: definition.decimals };
      })
    }, { headers: noStore });
  } catch (error) {
    console.error("[indicator-thresholds] Gagal memuat ambang indikator", error);
    return Response.json({ error: "Gagal memuat konfigurasi ambang indikator" }, { status: 503, headers: noStore });
  }
}

export async function PUT(request: Request) {
  const session = await requireAdmin();
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("key" in body) || typeof body.key !== "string") {
    return Response.json({ error: "Kunci indikator tidak valid" }, { status: 422, headers: noStore });
  }
  if (!("bands" in body)) return Response.json({ error: "Rentang status wajib diisi" }, { status: 422, headers: noStore });
  try {
    getIndicator(body.key);
  } catch {
    return Response.json({ error: "Indikator tidak ditemukan" }, { status: 404, headers: noStore });
  }
  const checked = validateIndicatorBands(body.bands);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 422, headers: noStore });
  try {
    const saved = await saveIndicatorThreshold(body.key, checked.bands, session.user.email ?? null);
    const definition = getIndicator(saved.key);
    return Response.json({ ...saved, name: definition.name, unit: definition.unit, decimals: definition.decimals }, { headers: noStore });
  } catch (error) {
    console.error("[indicator-thresholds] Gagal menyimpan ambang indikator", error);
    return Response.json({ error: "Gagal menyimpan ambang indikator" }, { status: 503, headers: noStore });
  }
}
