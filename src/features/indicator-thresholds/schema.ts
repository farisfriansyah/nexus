import { bandDefSchema, type BandDef } from "@/widgets/ops-eng/schemas";
import { validateBands } from "@/lib/status/engine";

export function validateIndicatorBands(input: unknown): { ok: true; bands: BandDef[] } | { ok: false; error: string } {
  const parsed = bandDefSchema.array().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Rentang status tidak valid" };
  for (const [index, band] of parsed.data.entries()) {
    if (band.min !== null && band.max !== null && band.min > band.max) {
      return { ok: false, error: `Nilai minimum rentang ${index + 1} harus lebih kecil atau sama dengan maksimum` };
    }
    if (band.min !== null && band.max !== null && band.min === band.max && !(band.minInclusive && band.maxInclusive)) {
      return { ok: false, error: `Rentang ${index + 1} yang hanya berisi satu nilai harus inklusif di kedua sisi` };
    }
  }
  const issues = validateBands(parsed.data);
  if (issues.length) return { ok: false, error: "Rentang harus mencakup semua nilai tanpa celah atau tumpang tindih" };
  return { ok: true, bands: parsed.data };
}
