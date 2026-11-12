import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { configForTravoUnit } from "@/features/travo/config";
import type { TravoConfig } from "@/features/travo/config";
import { travoApiPayloadSchema } from "@/features/travo/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ unit: string }> };

const noStore = { "Cache-Control": "no-store" };
const apiBaseUrl = "https://api2.plantvision.mikatasa.com";

export async function GET(_request: Request, { params }: RouteContext) {
  await requireSession();
  const { unit: rawUnit } = await params;
  const unit = Number(rawUnit);
  if (!/^[1-4]$/.test(rawUnit)) {
    return Response.json({ error: "Nomor Travo harus antara 1 dan 4." }, { status: 404, headers: noStore });
  }

  let configs: TravoConfig[];
  try {
    configs = await getDb().$queryRaw<TravoConfig[]>`
      SELECT machineId, listenerApiPort
      FROM tcp_configs
      WHERE UPPER(tipe) = 'TRAVO'
      ORDER BY CAST(listenerApiPort AS UNSIGNED) ASC
      LIMIT 4
    `;
  } catch (error) {
    console.error("[travo] Gagal membaca konfigurasi tcp_configs", error);
    return Response.json({ error: "Konfigurasi Travo tidak dapat dibaca." }, { status: 503, headers: noStore });
  }

  const config = configForTravoUnit(configs, unit);
  const port = config?.listenerApiPort.trim();
  if (!config || !port || !/^\d+$/.test(port)) {
    console.error(`[travo] Konfigurasi untuk Travo ${unit} tidak tersedia atau port tidak valid`);
    return Response.json({ error: `Konfigurasi Travo ${unit} tidak tersedia.` }, { status: 503, headers: noStore });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/${encodeURIComponent(port)}/travo`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000)
    });
  } catch (error) {
    console.error(`[travo] Gagal menghubungi API untuk Travo ${unit} port ${port}`, error);
    return Response.json({ error: `API Travo ${unit} tidak dapat dihubungi.` }, { status: 502, headers: noStore });
  }

  if (!upstream.ok) {
    console.error(`[travo] API Travo ${unit} port ${port} mengembalikan HTTP ${upstream.status}`);
    return Response.json({ error: `API Travo ${unit} mengembalikan HTTP ${upstream.status}.` }, { status: 502, headers: noStore });
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch (error) {
    console.error(`[travo] Respons API Travo ${unit} bukan JSON yang valid`, error);
    return Response.json({ error: `Respons API Travo ${unit} tidak valid.` }, { status: 502, headers: noStore });
  }

  const checked = travoApiPayloadSchema.safeParse(payload);
  if (!checked.success) {
    console.error(`[travo] Struktur respons API Travo ${unit} tidak sesuai`, checked.error.issues);
    return Response.json({ error: `Struktur data Travo ${unit} tidak valid.` }, { status: 502, headers: noStore });
  }

  return Response.json({
    unit,
    machineId: config.machineId,
    port,
    ...checked.data
  }, { headers: noStore });
}
