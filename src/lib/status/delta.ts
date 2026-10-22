import type { IndicatorDef } from "@/widgets/ops-eng/schemas";

export type DeltaTone = "good" | "bad" | "neutral";
export type DeltaArrow = "up" | "down" | "flat";
export interface DeltaResult { diff: number; arrow: DeltaArrow; tone: DeltaTone; unit: string }

/** Arah panah mengikuti tanda; warna mengikuti baik/buruk menurut direction. Satuan % menjadi "pp". */
export function computeDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  direction: IndicatorDef["direction"],
  unit: string
): DeltaResult | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  const diff = Math.round((current - previous) * 10_000) / 10_000;
  const arrow: DeltaArrow = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  let tone: DeltaTone = "neutral";
  if (diff !== 0) {
    if (direction === "LOWER_IS_BETTER") tone = diff < 0 ? "good" : "bad";
    else if (direction === "HIGHER_IS_BETTER") tone = diff > 0 ? "good" : "bad";
  }
  return { diff, arrow, tone, unit: unit === "%" ? "pp" : unit };
}
