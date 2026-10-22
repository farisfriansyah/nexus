import { getIndicator, monthlyKeys } from "@/config/ops-eng/indicators";
import { bandContains, evaluateStatus } from "@/lib/status/engine";
import { currentPeriod, monthWindow, shiftPeriod } from "@/lib/status/time";
import type { IndicatorDef, MonthlyPoint, OpsDataset, Scenario, Status } from "@/widgets/ops-eng/schemas";
import { createRng, gaussian, hashString, type Rng } from "./prng";

type Goal = "on_target" | "warning" | "critical";

/** Skenario "mixed": minimal satu entitas di tiap status. */
const mixedGoals: Record<string, Goal> = {
  "downtime.packing.autopack": "warning",
  "downtime.utility.kompresor": "warning",
  kalibrasi: "warning",
  "mtbf.kompresor_utility": "warning"
};

const HISTORY_MONTHS = 24;
const DAY = 86_400_000;

function goalFor(key: string, scenario: Scenario): Goal {
  if (scenario === "all-critical") return "critical";
  if (scenario === "mixed" || scenario === "stale") return mixedGoals[key] ?? "on_target";
  return "on_target";
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Nilai representatif di dalam band bertujuan (bukan di tepi). */
export function representativeValue(def: IndicatorDef, goal: Goal, rng: Rng): number {
  const matching = def.bands.filter((candidate) => candidate.status === goal);
  const chosen = matching[0];
  if (!chosen) return 0;
  if (def.decimals === 0) {
    const candidates: number[] = [];
    for (let value = 0; value <= 120; value += 1) if (matching.some((candidate) => bandContains(candidate, value))) candidates.push(value);
    return candidates[Math.floor(rng() * Math.min(candidates.length, 4))] ?? 0;
  }
  const lo = chosen.min ?? 0;
  const hi = chosen.max ?? lo + Math.max(1, lo * 0.5);
  const value = lo + (hi - lo) * (0.3 + rng() * 0.4);
  return round(value, def.decimals);
}

function pastGoal(scenario: Scenario, rng: Rng): Goal {
  if (scenario === "normal") return "on_target";
  const roll = rng();
  return roll < 0.78 ? "on_target" : roll < 0.92 ? "warning" : "critical";
}

function iso(ms: number) { return new Date(ms).toISOString(); }

export function buildOpsDataset(scenario: Scenario, now = Date.now()): OpsDataset {
  const endPeriod = currentPeriod(now);
  const periods = monthWindow(endPeriod, HISTORY_MONTHS);
  const staleOffset = scenario === "stale" ? 10 * DAY : 0;
  const updatedAt = iso(now - staleOffset - 3_600_000);
  const monthly: Record<string, MonthlyPoint[]> = {};
  const extras: OpsDataset["extras"] = {};

  for (const key of monthlyKeys) {
    const def = getIndicator(key);
    const rng = createRng(hashString(`${scenario}:${key}`));
    monthly[key] = periods.map((period, index) => {
      const isCurrent = index === periods.length - 1;
      if (scenario === "all-nodata" && (isCurrent || index >= periods.length - 3)) return { period, value: null, updatedAt };
      if (def.direction === "NEUTRAL") return { period, value: round(1234.56 + gaussian(rng) * 40, 2), updatedAt };
      const goal = isCurrent ? goalFor(key, scenario) : key === "k3.kecelakaan" ? "on_target" : pastGoal(scenario, rng);
      return { period, value: representativeValue(def, goal, rng), updatedAt };
    });
  }

  const kalibrasiValue = monthly.kalibrasi?.[HISTORY_MONTHS - 1]?.value ?? null;
  extras.kalibrasi = kalibrasiValue === null ? {} : { planned: 120, done: Math.round((120 * kalibrasiValue) / 100) };

  const mtbf: OpsDataset["mtbf"] = {};
  const mtbfGoalCounts: Record<Goal, number> = { on_target: 1, warning: 2, critical: 3 };
  for (const [key, windowDays] of [["mtbf.gearbox_reaktor", 365], ["mtbf.kompresor_utility", 365], ["mtbf.gearpump_filling", 30]] as const) {
    const count = mtbfGoalCounts[goalFor(key, scenario)];
    const failures = Array.from({ length: count }, (_, index) => iso(now - staleOffset - (windowDays / (count + 1)) * (index + 1) * DAY)).sort();
    mtbf[key] = scenario === "all-nodata" ? { failures: [], updatedAt, noData: true } : { failures, updatedAt };
  }

  const incidentDaysAgo = scenario === "all-critical" ? 3 : 87;
  const lastIncident = scenario === "all-nodata" ? null : iso(now - incidentDaysAgo * DAY);
  const casesThisMonth = scenario === "all-nodata" ? null : scenario === "all-critical" ? 1 : 0;
  if (monthly["k3.kecelakaan"] && casesThisMonth !== null) monthly["k3.kecelakaan"]![HISTORY_MONTHS - 1]!.value = casesThisMonth;

  return { scenario, generatedAt: now, monthly, extras, mtbf, safety: { lastIncidentDate: lastIncident, casesThisMonth, updatedAt } };
}

export function statusOf(key: string, value: number | null): Status {
  return evaluateStatus(getIndicator(key), value);
}

export { shiftPeriod };
