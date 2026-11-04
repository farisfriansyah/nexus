import { formatFixed } from "@/lib/format";
import { getIndicator } from "@/config/ops-eng/indicators";
import { aggregateStatus, evaluateStatus } from "@/lib/status/engine";
import { computeDelta } from "@/lib/status/delta";
import { computeMtbfDays, currentPeriod, daysSince, failuresInWindow, shiftPeriod, windowSeries } from "@/lib/status/time";
import type { LiveReading, MonthlyPayload, MonthlyRow, MtbfPayload, MtbfRow, OpsDataset, SafetyPayload, Status } from "@/widgets/ops-eng/schemas";

export interface SelectContext { endPeriod: string; now: number }

export function buildMonthlyRow(key: string, dataset: OpsDataset, ctx: SelectContext): MonthlyRow {
  const def = getIndicator(key);
  const series = windowSeries(dataset.monthly[key] ?? [], ctx.endPeriod, 12);
  const last = series[series.length - 1]!;
  const previous = series[series.length - 2];
  const value = last.value;
  const isCurrent = ctx.endPeriod === currentPeriod(dataset.generatedAt);
  const extra = isCurrent ? dataset.extras[key] : undefined;
  return {
    key, label: def.label, unit: def.unit, value, target: def.targetValue ?? null,
    status: evaluateStatus(def, value), deltaMoM: computeDelta(value, previous?.value, def.direction, def.unit)?.diff ?? null,
    series, updatedAt: last.updatedAt || dataset.generatedAt.toString(), ...extra
  };
}

export function buildMonthlyPayload(keys: string[], dataset: OpsDataset, ctx: SelectContext): MonthlyPayload {
  const rows = keys.map((key) => buildMonthlyRow(key, dataset, ctx));
  const updatedAt = rows.map((row) => row.updatedAt).sort().at(-1) ?? new Date(ctx.now).toISOString();
  return { period: ctx.endPeriod, rows, updatedAt };
}

const mtbfWindows: Record<string, number> = { "mtbf.gearbox_reaktor": 365, "mtbf.kompresor_utility": 365, "mtbf.gearpump_filling": 30 };

export function buildMtbfPayload(keys: string[], dataset: OpsDataset, ctx: SelectContext): MtbfPayload {
  const rows: MtbfRow[] = keys.map((key) => {
    const def = getIndicator(key);
    const entry = dataset.mtbf[key] ?? { failures: [], updatedAt: new Date(ctx.now).toISOString(), noData: true };
    const windowDays = mtbfWindows[key] ?? 365;
    const inWindow = failuresInWindow(entry.failures, ctx.now, windowDays);
    const last = [...entry.failures].sort().at(-1) ?? null;
    return {
      key, label: def.label, windowDays, failures: entry.failures, count: inWindow.length,
      daysSinceLast: daysSince(last, ctx.now), mtbfDays: computeMtbfDays(inWindow.length, windowDays),
      status: entry.noData ? "no_data" : evaluateStatus(def, inWindow.length), updatedAt: entry.updatedAt
    };
  });
  return { period: ctx.endPeriod, rows, updatedAt: rows.map((row) => row.updatedAt).sort().at(-1) ?? "" };
}

export function buildSafetyPayload(dataset: OpsDataset, ctx: SelectContext): SafetyPayload {
  const { lastIncidentDate, casesThisMonth, updatedAt } = dataset.safety;
  return {
    lastIncidentDate, daysSince: daysSince(lastIncidentDate, ctx.now), casesThisMonth, target: 0, updatedAt,
    status: casesThisMonth === null ? "no_data" : evaluateStatus(getIndicator("k3.kecelakaan"), casesThisMonth)
  };
}

export interface MonitoredUnit { id: string; label: string; status: Status; pic: string; group: string; valueText?: string }

const compressorNames = ["sullair", "boge", "kobelco", "hitachi"];

export function buildCriticalIndicatorAlerts(readings: Record<string, LiveReading>, statuses: Record<string, Status>): MonitoredUnit[] {
  return Object.entries(readings).flatMap(([key, reading]) => {
    if (statuses[key] !== "critical") return [];
    const def = getIndicator(key);
    const valueText = reading.value === null ? undefined : `${formatFixed(reading.value, def.decimals)} ${def.unit}`.trim();
    return [{ id: `indicator:${key}`, label: def.name, status: "critical" as const, pic: def.pic, group: "Live Utility", valueText }];
  });
}

/** Unit pantau = indikator × entitas; status = terburuk dari parameternya. */
export function buildMonitoredUnits(dataset: OpsDataset, live: Record<string, LiveReading> | null, ctx: SelectContext, now = ctx.now, statuses?: Record<string, Status>): MonitoredUnit[] {
  const units: MonitoredUnit[] = [];
  const liveStatus = (key: string): Status => {
    if (statuses?.[key]) return statuses[key]!;
    const def = getIndicator(key);
    const reading = live?.[key];
    if (!reading || now - reading.ts > (def.staleAfterSec ?? 120) * 1000) return "no_data";
    return evaluateStatus(def, reading.value);
  };
  const liveUnit = (id: string, label: string, keys: string[], group: string) => {
    const rank: Record<Status, number> = { critical: 0, warning: 1, no_data: 2, on_target: 3, neutral: 4 };
    const worstKey = [...keys].sort((a, b) => rank[liveStatus(a)] - rank[liveStatus(b)])[0]!;
    const def = getIndicator(worstKey);
    const reading = live?.[worstKey];
    const valueText = reading && reading.value !== null && liveStatus(worstKey) !== "no_data" ? `${formatFixed(reading.value, def.decimals)} ${def.unit}`.trim() : undefined;
    units.push({ id, label, status: aggregateStatus(keys.map(liveStatus)), pic: def.pic, group, valueText });
  };

  liveUnit("panel", "Panel Listrik", ["panel.volt", "panel.cosphi"], "Live Utility");
  liveUnit("ct.ma1", "Cooling Tower MA1", ["ct.ma1.temp"], "Live Utility");
  liveUnit("ct.ma4", "Cooling Tower MA4", ["ct.ma4.temp"], "Live Utility");
  liveUnit("boiler.ma4", "Boiler MA4", ["boiler.ma4.stack_temp", "boiler.ma4.pressure"], "Live Utility");
  for (const name of compressorNames) liveUnit(`compressor.${name}`, `Kompresor ${getIndicator(`compressor.${name}.temp`).name.split(" ")[1]}`, [`compressor.${name}.temp`, `compressor.${name}.pressure`], "Live Utility");
  for (const id of ["sb_ma1", "sb_ma4", "wb_ma1", "wb_ma4"]) liveUnit(`reactor.${id}`, `Reaktor ${id.replace("_", " ").toUpperCase()}`, [`reactor.${id}.temp`], "Live Utility");

  const monthlyUnits = Object.keys(dataset.monthly).filter((key) => getIndicator(key).bands.length > 0 && !key.startsWith("mtbf.") && key !== "k3.kecelakaan");
  for (const key of monthlyUnits) {
    const def = getIndicator(key);
    const row = buildMonthlyRow(key, dataset, ctx);
    units.push({ id: key, label: def.name, status: row.status, valueText: row.value === null ? undefined : `${formatFixed(row.value, def.decimals)} ${row.unit}`.trim(), pic: def.pic, group: key.startsWith("downtime") ? "Downtime" : "Governance" });
  }
  for (const row of buildMtbfPayload(Object.keys(dataset.mtbf), dataset, ctx).rows) {
    units.push({ id: row.key, label: getIndicator(row.key).name, status: row.status, valueText: `${row.count} kasus`, pic: getIndicator(row.key).pic, group: "Maintainability" });
  }
  const safety = buildSafetyPayload(dataset, ctx);
  units.push({ id: "k3.kecelakaan", label: "Kecelakaan Kerja", status: safety.status, valueText: safety.casesThisMonth === null ? undefined : `${safety.casesThisMonth} kasus`, pic: getIndicator("k3.kecelakaan").pic, group: "Governance" });
  return units;
}

export function selectAttention(units: MonitoredUnit[], limit = 3): MonitoredUnit[] {
  const order: Record<Status, number> = { critical: 0, warning: 1, no_data: 2, on_target: 3, neutral: 4 };
  return units.filter((unit) => unit.status === "critical" || unit.status === "warning").sort((a, b) => order[a.status] - order[b.status]).slice(0, limit);
}

export const OPS_END_PERIOD_STEPS = (now: number) => Array.from({ length: 7 }, (_, index) => shiftPeriod(currentPeriod(now), -index));
