import { formatTravoValue } from "./format";
import type { TravoWeight } from "./schema";

type TotalField = "energy" | "pt" | "pft" | "freq" | "dem" | "Zpt" | "Zqt" | "Zst" | "imbalance";
type Field = { key: TotalField; label: string; decimals: number; unit: string };

export const ENERGY_FIELDS: readonly Field[] = [
  { key: "energy", label: "Total Energi Aktif", decimals: 2, unit: "kWh" },
  { key: "pt", label: "Σ Daya Aktif (Pt)", decimals: 2, unit: "kW" },
  { key: "pft", label: "cosφ Total (PFt)", decimals: 3, unit: "" },
  { key: "freq", label: "Frekuensi (f)", decimals: 2, unit: "Hz" },
  { key: "dem", label: "Demand", decimals: 2, unit: "kW" }
];

export const SUMMARY_FIELDS: readonly Field[] = [
  { key: "Zpt", label: "Σ Pt — DAYA AKTIF", decimals: 2, unit: "kW" },
  { key: "Zqt", label: "Σ Qt — DAYA REAKTIF", decimals: 2, unit: "kvar" },
  { key: "Zst", label: "Σ St — DAYA SEMU", decimals: 2, unit: "kVA" },
  { key: "imbalance", label: "IMBALANCE ARUS", decimals: 1, unit: "%" }
];

export function formatTotalField(weight: TravoWeight | undefined, field: Field): string {
  return weight ? formatTravoValue(weight[field.key], field.decimals) : "–";
}
