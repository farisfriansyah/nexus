"use client";

import { useMemo } from "react";
import { getIndicator } from "@/config/ops-eng/indicators";
import { evaluateStatus, aggregateStatus } from "@/lib/status/engine";
import type { LiveReading, Status } from "@/widgets/ops-eng/schemas";
import { useTravo } from "./data";
import { formatTravoTimestamp, isTravoReadingStale, parseTravoNumber } from "./format";
import type { TravoLivePayload } from "./schema";

const METRIC_PATHS: Record<string, [phase: "l1" | "l2" | "l3", field: "v" | "i"] | ["total", "pft"]> = {
  "panel.phase.r.voltage": ["l1", "v"],
  "panel.phase.r.current": ["l1", "i"],
  "panel.phase.s.voltage": ["l2", "v"],
  "panel.phase.s.current": ["l2", "i"],
  "panel.phase.t.voltage": ["l3", "v"],
  "panel.phase.t.current": ["l3", "i"],
  "panel.cos_total": ["total", "pft"]
};

export const TRAVO_TREND_WINDOW_MS = 12 * 60 * 60 * 1000;
const MAX_TRAVO_TREND_POINTS = 9_000;

const trendHistory = new Map<number, Map<number, Record<string, number | null>>>();

export function travoMetricValue(weight: TravoLivePayload["processedWeight"], key: string): number | null {
  const path = METRIC_PATHS[key];
  if (!path) return null;
  const [phase, field] = path;
  return parseTravoNumber(phase === "total" ? weight.pft : weight[phase][field]);
}

export function recordTravoSnapshot(payload: TravoLivePayload) {
  const timestamp = Date.parse(payload.timestamp);
  if (!Number.isFinite(timestamp)) return;

  let history = trendHistory.get(payload.unit);
  if (!history) {
    history = new Map();
    trendHistory.set(payload.unit, history);
  }
  if (history.has(timestamp)) return;

  const values: Record<string, number | null> = {};
  for (const key of Object.keys(METRIC_PATHS)) values[key] = travoMetricValue(payload.processedWeight, key);
  history.set(timestamp, values);
  const cutoff = timestamp - TRAVO_TREND_WINDOW_MS;
  for (const recordedAt of history.keys()) {
    if (recordedAt >= cutoff) break;
    history.delete(recordedAt);
  }
  while (history.size > MAX_TRAVO_TREND_POINTS) history.delete(history.keys().next().value!);
}

export type TravoLiveGroup = {
  ready: boolean;
  status: Status;
  statuses: Record<string, Status>;
  stale: boolean;
  lastTs: number;
  live: { readings: Record<string, LiveReading>; statuses: Record<string, Status>; now: number };
  summary: string;
  updatedLabel?: string;
  pic: string;
  error?: string;
  retry: () => void;
};

export function useTravoLiveGroup(keys: string[], unit: number): TravoLiveGroup {
  const query = useTravo(unit);
  const now = query.dataUpdatedAt;
  const data = query.data;

  const live = useMemo(() => {
    const readings: Record<string, LiveReading> = {};
    const statuses: Record<string, Status> = {};
    const history = trendHistory.get(unit);
    const points = history ? [...history.entries()].sort(([left], [right]) => left - right) : [];

    for (const key of keys) {
      const def = getIndicator(key);
      const value = data ? travoMetricValue(data.processedWeight, key) : null;
      const ts = data ? Date.parse(data.timestamp) : 0;
      const trend = points.map(([t, values]) => ({ t, v: values[key] ?? null }));
      if (data && value !== null && !trend.some((point) => point.t === ts)) trend.push({ t: ts, v: value });
      readings[key] = { key, value, ts, trend };
      statuses[key] = data && value !== null && !isTravoReadingStale(data.timestamp, now)
        ? evaluateStatus(def, value)
        : "no_data";
    }

    return { readings, statuses, now };
  }, [data, keys, now, unit]);

  const statuses = Object.fromEntries(keys.map((key) => [key, live.statuses[key] ?? "no_data"]));
  const countable = keys.filter((key) => getIndicator(key).bands.length > 0);
  const lastTs = data ? Date.parse(data.timestamp) : 0;
  const summary = keys.map((key) => {
    const def = getIndicator(key);
    const value = live.readings[key]?.value;
    return `${def.name} ${value === null || value === undefined ? "tidak ada data" : `${value} ${def.unit}`}`;
  }).join("; ");

  return {
    ready: query.isSuccess && data !== undefined,
    status: aggregateStatus(countable.map((key) => statuses[key] ?? "no_data")),
    statuses,
    stale: data ? isTravoReadingStale(data.timestamp, now) || query.isError : false,
    lastTs,
    live,
    summary,
    updatedLabel: data ? formatTravoTimestamp(data.timestamp) : undefined,
    pic: keys.length ? getIndicator(keys[0]!).pic : "",
    error: !data && query.isError ? query.error.message : undefined,
    retry: () => { void query.refetch(); }
  };
}
