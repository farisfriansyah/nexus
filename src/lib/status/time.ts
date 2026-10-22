import type { MonthlyPoint } from "@/widgets/ops-eng/schemas";

export function currentPeriod(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftPeriod(period: string, deltaMonths: number): string {
  const [year, month] = period.split("-").map(Number) as [number, number];
  const index = year * 12 + (month - 1) + deltaMonths;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** 12 bulan berurutan yang berakhir di endPeriod (bulan terpilih di kanan). */
export function monthWindow(endPeriod: string, size = 12): string[] {
  return Array.from({ length: size }, (_, index) => shiftPeriod(endPeriod, index - (size - 1)));
}

export function windowSeries(points: MonthlyPoint[], endPeriod: string, size = 12): MonthlyPoint[] {
  const byPeriod = new Map(points.map((point) => [point.period, point]));
  return monthWindow(endPeriod, size).map((period) => byPeriod.get(period) ?? { period, value: null, updatedAt: "" });
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export function monthLabel(period: string): string {
  return monthNames[Number(period.slice(5, 7)) - 1] ?? period;
}

export function periodLabel(period: string): string {
  return `${monthLabel(period)} ${period.slice(0, 4)}`;
}

export function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? null : Math.max(0, Math.floor((now - time) / 86_400_000));
}

/** MTBF dalam hari = hari pengamatan ÷ jumlah kegagalan (null bila tanpa kegagalan). */
export function computeMtbfDays(failureCount: number, windowDays: number): number | null {
  return failureCount > 0 ? Math.round(windowDays / failureCount) : null;
}

export function failuresInWindow(failures: string[], now: number, windowDays: number): string[] {
  const from = now - windowDays * 86_400_000;
  return failures.filter((iso) => {
    const time = new Date(iso).getTime();
    return time >= from && time <= now;
  });
}

export const nowMs = (): number => Date.now();
