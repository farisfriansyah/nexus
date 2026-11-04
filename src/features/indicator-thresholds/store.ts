import { indicators } from "@/config/ops-eng/indicators";
import { getDb } from "@/lib/db";
import { bandDefSchema, type BandDef } from "@/widgets/ops-eng/schemas";
import type { Prisma } from "@/generated/prisma/client";
import { validateIndicatorBands } from "./schema";

export type IndicatorThresholdRecord = {
  key: string;
  bands: BandDef[];
  updatedAt: Date;
  updatedBy: string | null;
};

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
  await ensureDefaults();
  const rows = await getDb().indicatorThreshold.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return indicators.map((indicator) => {
    const row = byKey.get(indicator.key);
    if (!row) throw new Error(`Ambang indikator "${indicator.key}" belum tersedia`);
    const parsed = bandDefSchema.array().safeParse(row.bands);
    if (!parsed.success) throw new Error(`Ambang indikator "${indicator.key}" memiliki format tidak valid`);
    const valid = validateIndicatorBands(parsed.data);
    if (!valid.ok) throw new Error(`Ambang indikator "${indicator.key}" tidak valid: ${valid.error}`);
    return { key: row.key, bands: valid.bands, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
  });
}

export async function saveIndicatorThreshold(key: string, bands: BandDef[], updatedBy: string | null): Promise<IndicatorThresholdRecord> {
  const saved = await getDb().indicatorThreshold.upsert({
    where: { key },
    create: { key, bands: bands as Prisma.InputJsonValue, updatedBy },
    update: { bands: bands as Prisma.InputJsonValue, updatedBy }
  });
  return { key: saved.key, bands, updatedAt: saved.updatedAt, updatedBy: saved.updatedBy };
}
