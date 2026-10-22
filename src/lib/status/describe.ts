import type { BandDef, IndicatorDef } from "@/widgets/ops-eng/schemas";
import { formatFixed } from "@/lib/format";

const statusWord = { on_target: "Normal", warning: "Waspada", critical: "Kritis" } as const;

export function describeBand(band: BandDef, unit: string, decimals = 1): string {
  const suffix = unit ? ` ${unit}` : "";
  const fmt = (value: number) => formatFixed(value, decimals);
  let range: string;
  if (band.min === null && band.max !== null) range = `${band.maxInclusive ? "≤" : "<"} ${fmt(band.max)}`;
  else if (band.max === null && band.min !== null) range = `${band.minInclusive ? "≥" : ">"} ${fmt(band.min)}`;
  else if (band.min !== null && band.max !== null) {
    range = band.min === band.max ? `= ${fmt(band.min)}` : `${band.minInclusive ? "[" : "("}${fmt(band.min)} – ${fmt(band.max)}${band.maxInclusive ? "]" : ")"}`;
  } else range = "semua nilai";
  return `${statusWord[band.status]}: ${range}${suffix}`;
}

export function thresholdSentences(def: IndicatorDef): string[] {
  return def.bands.map((band) => describeBand(band, def.unit, def.decimals));
}
