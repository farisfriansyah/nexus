import type { BandDef, IndicatorDef, Status } from "@/widgets/ops-eng/schemas";

export const STATUS_SEVERITY: Record<Status, number> = { on_target: 0, neutral: 0, warning: 1, no_data: 2, critical: 3 };

export function bandContains(band: BandDef, value: number): boolean {
  if (band.min !== null && (band.minInclusive ? value < band.min : value <= band.min)) return false;
  if (band.max !== null && (band.maxInclusive ? value > band.max : value >= band.max)) return false;
  return true;
}

export interface Evaluation { status: Status; gap: boolean }

export function evaluateStatusDetailed(def: Pick<IndicatorDef, "key" | "bands">, value: number | null | undefined): Evaluation {
  if (value === null || value === undefined || Number.isNaN(value)) return { status: "no_data", gap: false };
  if (def.bands.length === 0) return { status: "neutral", gap: false };
  const match = def.bands.find((band) => bandContains(band, value));
  if (match) return { status: match.status, gap: false };
  if (process.env.NODE_ENV !== "production") console.warn(`[status] Tidak ada band yang cocok untuk ${def.key} = ${value}`);
  return { status: "no_data", gap: true };
}

export function evaluateStatus(def: Pick<IndicatorDef, "key" | "bands">, value: number | null | undefined): Status {
  return evaluateStatusDetailed(def, value).status;
}

export interface BandIssue { kind: "gap" | "overlap" | "open-start" | "open-end"; between: [number, number] | null }

/** Mendeteksi celah dan tumpang-tindih; band harus menutup seluruh garis bilangan. */
export function validateBands(bands: BandDef[]): BandIssue[] {
  if (bands.length === 0) return [];
  const sorted = [...bands].sort((a, b) => (a.min ?? -Infinity) - (b.min ?? -Infinity) || (a.minInclusive ? 0 : 1) - (b.minInclusive ? 0 : 1));
  const issues: BandIssue[] = [];
  if (sorted[0]!.min !== null) issues.push({ kind: "open-start", between: null });
  if (sorted[sorted.length - 1]!.max !== null) issues.push({ kind: "open-end", between: null });
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (previous.max === null || current.min === null) {
      issues.push({ kind: "overlap", between: null });
      continue;
    }
    if (previous.max > current.min) issues.push({ kind: "overlap", between: [current.min, previous.max] });
    else if (previous.max < current.min) issues.push({ kind: "gap", between: [previous.max, current.min] });
    else if (previous.maxInclusive && current.minInclusive) issues.push({ kind: "overlap", between: [current.min, current.min] });
    else if (!previous.maxInclusive && !current.minInclusive) issues.push({ kind: "gap", between: [current.min, current.min] });
  }
  return issues;
}

/** Terburuk dari seluruh status: critical > warning > no_data > on_target; neutral diabaikan. */
export function aggregateStatus(statuses: readonly Status[]): Status {
  const relevant = statuses.filter((status) => status !== "neutral");
  if (relevant.length === 0) return statuses.length > 0 ? "neutral" : "no_data";
  return relevant.reduce((worst, status) => (STATUS_SEVERITY[status] > STATUS_SEVERITY[worst] ? status : worst));
}

export function countByStatus(statuses: readonly Status[]): Record<Status, number> {
  const counts: Record<Status, number> = { on_target: 0, warning: 0, critical: 0, no_data: 0, neutral: 0 };
  for (const status of statuses) counts[status] += 1;
  return counts;
}

export function isWorse(next: Status, current: Status): boolean {
  return STATUS_SEVERITY[next] > STATUS_SEVERITY[current];
}
