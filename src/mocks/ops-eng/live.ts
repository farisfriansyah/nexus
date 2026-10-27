import { getIndicator, liveKeys } from "@/config/ops-eng/indicators";
import type { LiveReading, Scenario } from "@/widgets/ops-eng/schemas";
import { createRng, gaussian, hashString, type Rng } from "./prng";

interface LiveSpec { base: number | null; noise: number }

const mixed: Record<string, number | null> = {
  "panel.volt": 392, "panel.cosphi": 0.92, "panel.amp": 840, "panel.kwh": 210.5,
  "panel.phase.r.voltage": 232.9, "panel.phase.s.voltage": 233.4, "panel.phase.t.voltage": 234.7,
  "panel.phase.r.current": 176.04, "panel.phase.s.current": 194.34, "panel.phase.t.current": 188.16,
  "panel.cos_total": 0.984,
  "ct.ma1.temp": 32.5, "ct.ma4.temp": 36.5,
  "reactor.sb_ma1.temp": 33, "reactor.sb_ma4.temp": 39, "reactor.wb_ma1.temp": 30, "reactor.wb_ma4.temp": 47,
  "boiler.ma4.stack_temp": 188, "boiler.ma4.pressure": 3.75,
  "compressor.sullair.temp": 82, "compressor.sullair.pressure": 5.8,
  "compressor.boge.temp": 86, "compressor.boge.pressure": 5.6,
  "compressor.kobelco.temp": 98, "compressor.kobelco.pressure": 6,
  "compressor.hitachi.temp": null, "compressor.hitachi.pressure": null
};

const critical: Record<string, number | null> = {
  ...mixed, "panel.volt": 360, "panel.cosphi": 0.7, "ct.ma1.temp": 40, "ct.ma4.temp": 41, "reactor.sb_ma1.temp": 48, "reactor.sb_ma4.temp": 49, "reactor.wb_ma1.temp": 47, "reactor.wb_ma4.temp": 50, "boiler.ma4.stack_temp": 245, "boiler.ma4.pressure": 2,
  "panel.phase.r.voltage": 224, "panel.phase.s.voltage": 244, "panel.phase.t.voltage": 232,
  "panel.phase.r.current": 210, "panel.phase.s.current": 240, "panel.phase.t.current": 225, "panel.cos_total": 0.72,
  "compressor.sullair.temp": 105, "compressor.sullair.pressure": 4.6, "compressor.boge.temp": 103, "compressor.boge.pressure": 7.6,
  "compressor.kobelco.temp": 108, "compressor.kobelco.pressure": 4.7, "compressor.hitachi.temp": 104, "compressor.hitachi.pressure": 7.5
};

const normal: Record<string, number | null> = {
  ...mixed, "ct.ma4.temp": 32, "reactor.sb_ma4.temp": 34, "reactor.wb_ma4.temp": 33, "boiler.ma4.pressure": 4.5, "compressor.kobelco.temp": 84, "compressor.hitachi.temp": 80, "compressor.hitachi.pressure": 5.9
};

function baseFor(scenario: Scenario): Record<string, number | null> {
  if (scenario === "normal") return normal;
  if (scenario === "all-critical") return critical;
  if (scenario === "all-nodata") return Object.fromEntries(liveKeys.map((key) => [key, null]));
  return mixed;
}

function specFor(key: string, scenario: Scenario): LiveSpec {
  const def = getIndicator(key);
  const span = def.domain ? def.domain[1] - def.domain[0] : 20;
  const base = baseFor(scenario)[key] ?? null;
  const noise = key === "panel.amp" ? 12
    : key === "panel.kwh" ? 2
      : key.endsWith(".current") ? 0.7
        : key.endsWith(".voltage") ? 0.12
          : key === "panel.cos_total" ? 0.001
            : span * 0.006;
  return { base, noise };
}

export const TREND_POINTS = 60;
export const TREND_STEP_MS = 60_000;
export const TICK_MS = 2000;

export interface LiveTick { key: string; value: number | null; ts: number }

export interface LiveSimulator {
  snapshot(): LiveReading[];
  tick(): LiveTick[];
}

/** Random-walk dengan mean-reversion; deterministik per (scenario, seed). */
export function createLiveSimulator(scenario: Scenario, now = Date.now(), seed = 7): LiveSimulator {
  const rng: Rng = createRng(hashString(`live:${scenario}:${seed}`));
  const stale = scenario === "stale";
  const anchor = stale ? now - 10 * 60_000 : now;
  const state = new Map<string, { spec: LiveSpec; value: number | null; trend: { t: number; v: number | null }[] }>();
  let lastTrendShift = anchor;

  const step = (spec: LiveSpec, value: number) => value + (spec.base! - value) * 0.25 + gaussian(rng) * spec.noise;

  for (const key of liveKeys) {
    const spec = specFor(key, scenario);
    let value = spec.base;
    const trend: { t: number; v: number | null }[] = [];
    for (let index = TREND_POINTS - 1; index >= 0; index -= 1) {
      if (spec.base !== null && value !== null) value = step(spec, value);
      trend.push({ t: anchor - index * TREND_STEP_MS, v: value === null ? null : value });
    }
    state.set(key, { spec, value, trend });
  }

  return {
    snapshot() {
      return [...state.entries()].map(([key, item]) => ({ key, value: item.value, ts: anchor, trend: item.trend.map((point) => ({ ...point })) }));
    },
    tick() {
      if (stale) return [];
      const ts = Date.now();
      const shift = ts - lastTrendShift >= TREND_STEP_MS;
      if (shift) lastTrendShift = ts;
      return [...state.entries()].map(([key, item]) => {
        if (item.value !== null) item.value = step(item.spec, item.value);
        const last = item.trend[item.trend.length - 1]!;
        if (shift) { item.trend.shift(); item.trend.push({ t: ts, v: item.value }); } else { last.v = item.value; last.t = ts; }
        return { key, value: item.value, ts };
      });
    }
  };
}

/** Riwayat 24 jam (interval 5 menit) untuk drawer analitik. */
export function liveHistory24h(key: string, scenario: Scenario, now = Date.now()): { t: number; v: number | null }[] {
  const spec = specFor(key, scenario);
  const rng = createRng(hashString(`hist:${scenario}:${key}`));
  const points: { t: number; v: number | null }[] = [];
  let value = spec.base;
  for (let index = 287; index >= 0; index -= 1) {
    if (value !== null && spec.base !== null) value = value + (spec.base - value) * 0.1 + gaussian(rng) * spec.noise * 1.6;
    points.push({ t: now - index * 300_000, v: value });
  }
  return points;
}
