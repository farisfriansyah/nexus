import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { indicators } from "@/config/ops-eng/indicators";
import type { Prisma } from "@/generated/prisma/client";

const pageSize = 30;

export async function listNotifications(before?: number) {
  const db = getDb();
  const where: Prisma.AuditLogWhereInput = { action: "alert.critical" };
  const [rows, unread, active] = await Promise.all([
    db.auditLog.findMany({
      where: { ...where, ...(before ? { id: { lt: before } } : {}) },
      orderBy: { id: "desc" },
      take: pageSize + 1
    }),
    db.auditLog.count({ where: { ...where, isRead: false } }),
    db.travoAlertState.findMany({
      where: { critical: true, observedAt: { gte: new Date(Date.now() - 30_000) } },
      orderBy: [{ unit: "asc" }, { key: "asc" }]
    })
  ]);
  const items = rows.slice(0, pageSize).map((row) => {
    const details = typeof row.details === "object" && row.details !== null && !Array.isArray(row.details) ? row.details : {};
    const key = typeof details.key === "string" ? details.key : "";
    const definition = indicators.find((item) => item.key === key);
    return {
      id: row.id,
      label: definition?.name ?? (key || row.target || "Indikator"),
      unit: typeof details.unit === "number" ? details.unit : null,
      value: typeof details.value === "number" ? details.value : null,
      unitLabel: typeof details.unitLabel === "string" ? details.unitLabel : "",
      observedAt: typeof details.observedAt === "string" ? details.observedAt : row.createdAt.toISOString(),
      isRead: row.isRead,
      isResolved: row.isResolved
    };
  });
  return {
    items, unread,
    active: active.map((state) => ({
      unit: state.unit,
      key: state.key,
      label: indicators.find((item) => item.key === state.key)?.name ?? state.key,
      observedAt: state.observedAt.toISOString()
    })),
    nextCursor: rows.length > pageSize ? items[items.length - 1]!.id : null
  };
}

export type NotificationUpdate = {
  selection: "all" | number[];
  field: "isRead" | "isResolved";
  value: boolean;
};

export async function updateNotifications(update: NotificationUpdate, actor: string) {
  const db = getDb();
  return db.$transaction(async (tx) => {
    const result = await tx.auditLog.updateMany({
      where: {
        action: "alert.critical",
        ...(update.selection === "all" ? {} : { id: { in: update.selection } }),
        [update.field]: !update.value
      },
      data: { [update.field]: update.value }
    });
    if (result.count) {
      await writeAudit(tx, {
        action: "notification.update",
        actor,
        details: { selection: update.selection, field: update.field, value: update.value, count: result.count }
      });
    }
    return result.count;
  });
}
