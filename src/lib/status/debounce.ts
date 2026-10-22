import type { IndicatorDef, LiveReading, Status } from "@/widgets/ops-eng/schemas";
import { isWorse } from "./engine";

export const DEFAULT_DEBOUNCE = { escalateSec: 10, deescalateSec: 60 };

export interface StatusDebouncer {
  push(raw: Status): void;
  readonly current: Status;
  dispose(): void;
}

/** Debounce asimetris: status lebih buruk naik cepat, status lebih baik turun lambat. */
export function createStatusDebouncer(
  initial: Status,
  options: { escalateSec: number; deescalateSec: number },
  onChange: (status: Status) => void
): StatusDebouncer {
  let shown = initial;
  let pending: Status | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };

  return {
    push(raw) {
      if (raw === shown) { clear(); return; }
      if (pending === raw) return;
      clear();
      pending = raw;
      const seconds = isWorse(raw, shown) ? options.escalateSec : options.deescalateSec;
      timer = setTimeout(() => {
        shown = raw;
        pending = undefined;
        timer = undefined;
        onChange(raw);
      }, seconds * 1000);
    },
    get current() { return shown; },
    dispose: clear
  };
}

export function debounceOptions(def: Pick<IndicatorDef, "debounce">) {
  return def.debounce ?? DEFAULT_DEBOUNCE;
}

export function isReadingStale(reading: Pick<LiveReading, "ts"> | null | undefined, staleAfterSec: number | undefined, now: number): boolean {
  if (!reading) return false;
  return now - reading.ts > (staleAfterSec ?? 120) * 1000;
}

/** Data bulanan dianggap usang bila diinput lebih dari 3 hari lalu. */
export const MONTHLY_STALE_DAYS = 3;

export function daysBetween(fromIso: string | number | Date, now: number): number {
  const from = fromIso instanceof Date ? fromIso.getTime() : new Date(fromIso).getTime();
  return Math.floor((now - from) / 86_400_000);
}

export function monthlyStaleDays(updatedAt: string, now: number): number | null {
  const days = daysBetween(updatedAt, now);
  return days > MONTHLY_STALE_DAYS ? days : null;
}
