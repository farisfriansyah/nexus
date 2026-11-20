import { indicators } from "@/config/ops-eng/indicators";
import { getDb } from "@/lib/db";
import { bandDefSchema, type BandDef } from "@/widgets/ops-eng/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { validateIndicatorBands } from "./schema";
import { writeAudit } from "@/lib/audit";

export type IndicatorThresholdRecord = {
  key: string;
  bands: BandDef[];
  updatedAt: Date;
  updatedBy: string | null;
};

const CACHE_TTL_MS = 60_000;

type ThresholdCache = {
  records: IndicatorThresholdRecord[];
  expiresAt: number;
  pending?: Promise<IndicatorThresholdRecord[]>;
};

const globalForThresholds = globalThis as typeof globalThis & {
  indicatorThresholdCache?: ThresholdCache;
};

function getThresholdCache(): ThresholdCache {
  globalForThresholds.indicatorThresholdCache ??= { records: [], expiresAt: 0 };
  return globalForThresholds.indicatorThresholdCache;
}

async function ensureDefaults() {
  const existing = await getDb().indicatorThreshold.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((row) => row.key));
  const missing = indicators.filter((indicator) => !existingKeys.has(indicator.key));
  if (!missing.length) return;
  await getDb().indicatorThreshold.createMany({
    data: missing.map((indicator) => ({
      key: indicator.key,
      bands: indicator.bands as Prisma.InputJsonValue
    })),
    skipDuplicates: true
  });
}

export async function listIndicatorThresholds(): Promise<IndicatorThresholdRecord[]> {
  const cache = getThresholdCache();
  if (cache.expiresAt > Date.now()) return cache.records;
  if (cache.pending) return cache.pending;

  const pending = (async () => {
    try {
      await ensureDefaults();
      const rows = await getDb().indicatorThreshold.findMany();
      const byKey = new Map(rows.map((row) => [row.key, row]));
      const records = indicators.map((indicator) => {
        const row = byKey.get(indicator.key);
        if (!row) throw new Error(`Ambang indikator "${indicator.key}" belum tersedia`);
        const parsed = bandDefSchema.array().safeParse(row.bands);
        if (!parsed.success) throw new Error(`Ambang indikator "${indicator.key}" memiliki format tidak valid`);
        const valid = validateIndicatorBands(parsed.data);
        if (!valid.ok) throw new Error(`Ambang indikator "${indicator.key}" tidak valid: ${valid.error}`);
        return { key: row.key, bands: valid.bands, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
      });
      cache.records = records;
      cache.expiresAt = Date.now() + CACHE_TTL_MS;
      return records;
    } catch (error) {
      if (cache.records.length) {
        cache.expiresAt = Date.now() + CACHE_TTL_MS;
        return cache.records;
      }
      throw error;
    } finally {
      cache.pending = undefined;
    }
  })();
  cache.pending = pending;
  return pending;
}

export async function saveIndicatorThreshold(key: string, bands: BandDef[], updatedBy: string | null): Promise<IndicatorThresholdRecord> {
  const saved = await getDb().$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ bands: unknown }[]>`SELECT bands FROM IndicatorThreshold WHERE \`key\` = ${key} FOR UPDATE`;
    const previous = rows[0] ? await tx.indicatorThreshold.findUniqueOrThrow({ where: { key } }) : null;
    const oldBands = previous?.bands ?? indicators.find((indicator) => indicator.key === key)!.bands;
    const result = await tx.indicatorThreshold.upsert({
      where: { key },
      create: { key, bands: bands as Prisma.InputJsonValue, updatedBy },
      update: { bands: bands as Prisma.InputJsonValue, updatedBy }
    });
    await writeAudit(tx, { action: "threshold.update", actor: updatedBy, target: key, details: { before: oldBands, after: bands } as Prisma.InputJsonValue });
    return result;
  });
  const cache = getThresholdCache();
  cache.expiresAt = 0;
  return { key: saved.key, bands, updatedAt: saved.updatedAt, updatedBy: saved.updatedBy };
}
