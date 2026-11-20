import { getDb } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type AuditEntry = {
  action: string;
  actor?: string | null;
  target?: string | null;
  details?: Prisma.InputJsonValue;
};

export async function writeAudit(db: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({ data: entry });
}

export async function recordSecurityAudit(entry: AuditEntry): Promise<void> {
  try {
    await writeAudit(getDb(), entry);
  } catch (error) {
    console.error("[audit] Gagal mencatat kejadian keamanan", error);
  }
}

let lastCleanup = 0;
let cleanupPending = false;

export async function cleanupOldLogs(): Promise<void> {
  const now = Date.now();
  if (cleanupPending || now - lastCleanup < 24 * 60 * 60 * 1000) return;
  cleanupPending = true;
  try {
    const cutoff = new Date(now);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
    const db = getDb();
    await db.$transaction([
      db.loginLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
    ]);
    lastCleanup = now;
  } catch (error) {
    console.error("[audit] Gagal membersihkan log kedaluwarsa", error);
  } finally {
    cleanupPending = false;
  }
}
