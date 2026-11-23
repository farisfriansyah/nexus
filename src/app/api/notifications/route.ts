import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { listNotifications, updateNotifications } from "@/features/notifications/store";

const noStore = { "Cache-Control": "no-store" };
const updateSchema = z.object({
  selection: z.union([z.literal("all"), z.array(z.number().int().positive()).min(1).max(100)]),
  field: z.enum(["isRead", "isResolved"]),
  value: z.boolean()
});

export async function GET(request: Request) {
  await requireSession();
  const cursor = new URL(request.url).searchParams.get("before");
  if (cursor !== null && (!/^[1-9]\d*$/.test(cursor) || !Number.isSafeInteger(Number(cursor)))) {
    return Response.json({ error: "Cursor tidak valid" }, { status: 422, headers: noStore });
  }
  try {
    return Response.json(await listNotifications(cursor ? Number(cursor) : undefined), { headers: noStore });
  } catch (error) {
    console.error("[notifications] Gagal memuat notifikasi", error);
    return Response.json({ error: "Gagal memuat notifikasi" }, { status: 503, headers: noStore });
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pilihan notifikasi tidak valid" }, { status: 422, headers: noStore });
  try {
    const count = await updateNotifications(parsed.data, session.user.email!);
    return Response.json({ count }, { headers: noStore });
  } catch (error) {
    console.error("[notifications] Gagal memperbarui notifikasi", error);
    return Response.json({ error: "Gagal memperbarui notifikasi" }, { status: 503, headers: noStore });
  }
}
