"use client";
import { nowMs } from "@/lib/status/time";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { getIndicator } from "@/config/ops-eng/indicators";
import { createStatusDebouncer, debounceOptions, isReadingStale, type StatusDebouncer } from "@/lib/status/debounce";
import { evaluateStatus } from "@/lib/status/engine";
import { currentPeriod } from "@/lib/status/time";
import { buildOpsDataset } from "@/mocks/ops-eng/dataset";
import { createLiveSimulator, TICK_MS, type LiveTick } from "@/mocks/ops-eng/live";
import { DEFAULT_SCENARIO, parseScenario, type LiveReading, type OpsDataset, type Scenario, type Status } from "@/widgets/ops-eng/schemas";
import { getIndicatorThresholdRevision, subscribeIndicatorThresholds } from "@/features/indicator-thresholds/runtime";
import { useIndicatorThresholdRevision } from "@/features/indicator-thresholds/hooks";

/* ---------- scenario & periode ---------- */

export const ScenarioContext = createContext<Scenario | null>(null);
export const PeriodContext = createContext<string | null>(null);

const noopSubscribe = () => () => {};
const urlScenario = () => (typeof window === "undefined" ? DEFAULT_SCENARIO : parseScenario(new URLSearchParams(window.location.search).get("scenario")));

export function useScenario(): Scenario {
  const forced = useContext(ScenarioContext);
  const fromUrl = useSyncExternalStore(noopSubscribe, urlScenario, () => DEFAULT_SCENARIO);
  return forced ?? fromUrl;
}

export function useEndPeriod(): string {
  const forced = useContext(PeriodContext);
  return useMemo(() => forced ?? currentPeriod(nowMs()), [forced]);
}

/* ---------- dataset bulanan ---------- */

const datasetCache = new Map<Scenario, { revision: number; dataset: OpsDataset }>();
export function getDataset(scenario: Scenario): OpsDataset {
  const revision = getIndicatorThresholdRevision();
  const cached = datasetCache.get(scenario);
  if (cached?.revision === revision) return cached.dataset;
  const dataset = buildOpsDataset(scenario);
  datasetCache.set(scenario, { revision, dataset });
  return dataset;
}

export function useDataset(): OpsDataset {
  const scenario = useScenario();
  useIndicatorThresholdRevision();
  return getDataset(scenario);
}

/* ---------- live store ---------- */

export interface LiveSnapshot {
  ready: boolean;
  readings: Record<string, LiveReading>;
  statuses: Record<string, Status>;
  now: number;
}

const EMPTY: LiveSnapshot = { ready: false, readings: {}, statuses: {}, now: 0 };

class LiveStore {
  snapshot: LiveSnapshot = EMPTY;
  private listeners = new Set<() => void>();
  private source: EventSource | null = null;
  private fallback: ReturnType<typeof setInterval> | null = null;
  private clock: ReturnType<typeof setInterval> | null = null;
  private unsubscribeThresholds: (() => void) | null = null;
  private readings = new Map<string, LiveReading>();
  private debouncers = new Map<string, StatusDebouncer>();
  private shown = new Map<string, Status>();

  constructor(private scenario: Scenario) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    const now = nowMs();
    const readings: Record<string, LiveReading> = {};
    const statuses: Record<string, Status> = {};
    for (const [key, reading] of this.readings) {
      readings[key] = reading;
      const def = getIndicator(key);
      statuses[key] = isReadingStale(reading, def.staleAfterSec, now) ? "no_data" : (this.shown.get(key) ?? "no_data");
    }
    this.snapshot = { ready: true, readings, statuses, now };
    this.listeners.forEach((listener) => listener());
  }

  private applySnapshot(list: LiveReading[]) {
    this.debouncers.forEach((debouncer) => debouncer.dispose());
    this.debouncers.clear();
    this.readings.clear();
    this.shown.clear();
    for (const reading of list) {
      const def = getIndicator(reading.key);
      const initial = evaluateStatus(def, reading.value);
      this.readings.set(reading.key, reading);
      this.shown.set(reading.key, initial);
      this.debouncers.set(reading.key, createStatusDebouncer(initial, debounceOptions(def), (status) => { this.shown.set(reading.key, status); this.emit(); }));
    }
    this.emit();
  }

  private applyTicks(ticks: LiveTick[]) {
    for (const tick of ticks) {
      const previous = this.readings.get(tick.key);
      if (!previous) continue;
      const trend = previous.trend.slice();
      const last = trend[trend.length - 1];
      if (last && tick.ts - last.t >= 60_000) { trend.shift(); trend.push({ t: tick.ts, v: tick.value }); } else if (last) trend[trend.length - 1] = { t: tick.ts, v: tick.value };
      this.readings.set(tick.key, { ...previous, value: tick.value, ts: tick.ts, trend });
      this.debouncers.get(tick.key)?.push(evaluateStatus(getIndicator(tick.key), tick.value));
    }
    this.emit();
  }

  private startFallback() {
    if (this.fallback) return;
    const simulator = createLiveSimulator(this.scenario);
    this.applySnapshot(simulator.snapshot());
    this.fallback = setInterval(() => this.applyTicks(simulator.tick()), TICK_MS);
  }

  private start() {
    this.unsubscribeThresholds = subscribeIndicatorThresholds(() => this.reconfigureStatuses());
    this.clock = setInterval(() => this.emit(), 10_000);
    if (typeof EventSource === "undefined") { this.startFallback(); return; }
    const source = new EventSource(`/api/mock/stream?live=1&scenario=${this.scenario}`);
    this.source = source;
    source.addEventListener("snapshot", (event) => this.applySnapshot(JSON.parse((event as MessageEvent<string>).data)));
    source.addEventListener("tick", (event) => this.applyTicks(JSON.parse((event as MessageEvent<string>).data)));
    source.onerror = () => { if (!this.readings.size) { source.close(); this.source = null; this.startFallback(); } };
  }

  private reconfigureStatuses() {
    for (const [key, reading] of this.readings) {
      const def = getIndicator(key);
      const initial = evaluateStatus(def, reading.value);
      this.debouncers.get(key)?.dispose();
      this.shown.set(key, initial);
      this.debouncers.set(key, createStatusDebouncer(initial, debounceOptions(def), (status) => {
        this.shown.set(key, status);
        this.emit();
      }));
    }
    this.emit();
  }

  private stop() {
    this.unsubscribeThresholds?.();
    this.unsubscribeThresholds = null;
    this.source?.close();
    this.source = null;
    if (this.fallback) clearInterval(this.fallback);
    if (this.clock) clearInterval(this.clock);
    this.fallback = null;
    this.clock = null;
    this.debouncers.forEach((debouncer) => debouncer.dispose());
    this.debouncers.clear();
    this.readings.clear();
    this.shown.clear();
    this.snapshot = EMPTY;
  }
}

const stores = new Map<Scenario, LiveStore>();
function storeFor(scenario: Scenario) {
  let store = stores.get(scenario);
  if (!store) { store = new LiveStore(scenario); stores.set(scenario, store); }
  return store;
}

export function useLive(): LiveSnapshot {
  const scenario = useScenario();
  const store = storeFor(scenario);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY);
}

export function useLiveReading(key: string) {
  const live = useLive();
  const reading = live.readings[key] ?? null;
  const stale = reading ? isReadingStale(reading, getIndicator(key).staleAfterSec, live.now) : false;
  return { ready: live.ready, reading, status: live.statuses[key] ?? ("no_data" as Status), stale, now: live.now };
}
