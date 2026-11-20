import { indicators } from "@/config/ops-eng/indicators";
import { listIndicatorThresholds } from "@/features/indicator-thresholds/store";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { Prisma } from "@/generated/prisma/client";
import { evaluateStatus } from "@/lib/status/engine";
import { isTravoReadingStale } from "./format";
import { TRAVO_ALERT_KEYS, travoMetricValue } from "./metrics";
import type { TravoLivePayload } from "./schema";

function isWriteConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  if (error.code !== "P2010") return false;
  const meta = error.meta;
  if (meta?.code === "1213" || meta?.code === 1213) return true;
  const adapterError = meta?.driverAdapterError;
  if (typeof adapterError !== "object" || adapterError === null || !("cause" in adapterError)) return false;
  const cause = adapterError.cause;
  return typeof cause === "object" && cause !== null && "kind" in cause && cause.kind === "TransactionWriteConflict";
}

export async function recordTravoAlertTransitions(payload: TravoLivePayload, now = Date.now()): Promise<void> {
  if (isTravoReadingStale(payload.timestamp, now)) return;
  const thresholds = new Map((await listIndicatorThresholds()).map((entry) => [entry.key, entry.bands]));
  const observedAt = new Date(payload.timestamp);
  const db = getDb();

  const record = () => db.$transaction(async (tx) => {
    for (const key of TRAVO_ALERT_KEYS) {
      const def = indicators.find((indicator) => indicator.key === key);
      const bands = thresholds.get(key);
      if (!def || !bands) throw new Error(`Ambang indikator ${key} tidak tersedia`);
      const value = travoMetricValue(payload.processedWeight, key);
      const status = evaluateStatus({ key, bands }, value);
      if (value === null || status === "no_data" || status === "neutral") continue;
      await tx.$executeRaw`INSERT INTO TravoAlertState (unit, \`key\`, critical, awaitingNormal, observedAt) VALUES (${payload.unit}, ${key}, false, false, ${new Date(0)}) ON DUPLICATE KEY UPDATE unit = VALUES(unit)`;
      const rows = await tx.$queryRaw<{ critical: number | boolean; awaitingNormal: number | boolean; observedAt: Date }[]>`
        SELECT critical, awaitingNormal, observedAt FROM TravoAlertState WHERE unit = ${payload.unit} AND \`key\` = ${key} FOR UPDATE
      `;
      const previous = rows[0];
      if (!previous) throw new Error(`Status alert Travo ${payload.unit} tidak tersedia`);
      if (observedAt <= previous.observedAt) continue;
      const critical = status === "critical";
      const wasCritical = Boolean(previous.critical);
      const awaitingNormal = (wasCritical || Boolean(previous.awaitingNormal)) && status !== "on_target";
      const details = { unit: payload.unit, machineId: payload.machineId, key, value, unitLabel: def.unit, status, observedAt: payload.timestamp };
      if (wasCritical !== critical) {
        await writeAudit(tx, {
          action: critical ? "alert.critical" : "alert.exit",
          target: `travo:${payload.unit}:${key}`,
          details
        });

      }
      if (status === "on_target" && (wasCritical || Boolean(previous.awaitingNormal))) {
        await writeAudit(tx, { action: "alert.normal", target: `travo:${payload.unit}:${key}`, details });
      }
      await tx.travoAlertState.update({ where: { unit_key: { unit: payload.unit, key } }, data: { critical, awaitingNormal, observedAt } });
    }
  });

  for (let attempt = 1; ; attempt += 1) {
    try {
      await record();
      return;
    } catch (error) {
      if (attempt >= 3 || !isWriteConflict(error)) throw error;
      console.warn(`[audit] Konflik transaksi alert Travo ${payload.unit}; mencoba lagi (${attempt}/2)`);
      await new Promise((resolve) => setTimeout(resolve, 20 * attempt + Math.random() * 20));
    }
  }
}
