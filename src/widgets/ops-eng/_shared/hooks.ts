"use client";
import { nowMs } from "@/lib/status/time";

import { useMemo, useSyncExternalStore } from "react";
import { getIndicator } from "@/config/ops-eng/indicators";
import { buildMonitoredUnits, buildMonthlyPayload, type MonitoredUnit } from "./selectors";
import { useDataset, useEndPeriod, useLive } from "./data";
import { monthlyStaleDays } from "@/lib/status/debounce";
import { formatFixed } from "@/lib/format";
import type { MonthlyPayload } from "@/widgets/ops-eng/schemas";

const noop = () => () => {};
/** false di server/hidrasi, true setelah mount: menghindari mismatch waktu. */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function useMonthly(keys: string[]): { mounted: boolean; payload: MonthlyPayload | null; stale: boolean } {
  const mounted = useMounted();
  const dataset = useDataset();
  const endPeriod = useEndPeriod();
  const joined = keys.join("|");
  const payload = useMemo(() => (mounted ? buildMonthlyPayload(joined.split("|"), dataset, { endPeriod, now: nowMs() }) : null), [mounted, joined, dataset, endPeriod]);
  const staleDays = payload ? monthlyStaleDays(payload.updatedAt, nowMs()) : null;
  return { mounted, payload, stale: staleDays !== null && staleDays > 3 };
}

export function useUnits(): { ready: boolean; units: MonitoredUnit[] } {
  const mounted = useMounted();
  const dataset = useDataset();
  const endPeriod = useEndPeriod();
  const live = useLive();
  const units = useMemo(
    () => (mounted && live.ready ? buildMonitoredUnits(dataset, live.readings, { endPeriod, now: live.now || nowMs() }, live.now || nowMs(), live.statuses) : []),
    [mounted, live, dataset, endPeriod]
  );
  return { ready: mounted && live.ready, units };
}

export function formatIndicator(key: string, value: number | null): string {
  return formatFixed(value, getIndicator(key).decimals);
}
