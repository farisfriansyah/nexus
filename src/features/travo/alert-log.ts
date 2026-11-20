import { indicators } from "@/config/ops-eng/indicators";
import { listIndicatorThresholds } from "@/features/indicator-thresholds/store";
import { getDb } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { evaluateStatus } from "@/lib/status/engine";
import { isTravoReadingStale } from "./format";
import { TRAVO_ALERT_KEYS, travoMetricValue } from "./metrics";
import type { TravoLivePayload } from "./schema";

export async function recordTravoAlertTransitions(payload: TravoLivePayload, now = Date.now()): Promise<void> {
  if (isTravoReadingStale(payload.timestamp, now)) return;
  const thresholds = new Map((await listIndicatorThresholds()).map((entry) => [entry.key, entry.bands]));
  const observedAt = new Date(payload.timestamp);
  const db = getDb();

  await db.$transaction(async (tx) => {
    for (const key of TRAVO_ALERT_KEYS) {
      const def = indicators.find((indicator) => indicator.key === key);
      const bands = thresholds.get(key);
      if (!def || !bands) throw new Error(`Ambang indikator ${key} tidak tersedia`);
      const value = travoMetricValue(payload.processedWeight, key);
      const status = evaluateStatus({ key, bands }, value);
      if (value === null || status === "no_data" || status === "neutral") continue;
      await tx.$executeRaw`INSERT IGNORE INTO TravoAlertState (unit, \`key\`, critical, awaitingNormal, observedAt) VALUES (${payload.unit}, ${key}, false, false, ${new Date(0)})`;
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
}
