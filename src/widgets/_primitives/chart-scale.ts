export type NumericDomain = readonly [number, number];

export type TimedChartPoint = { t: number; v: number | null };

export function fitTimeWindow<T extends TimedChartPoint>(
  series: Record<string, readonly T[]>,
  maxDurationMs: number
): { start: number; end: number; series: Record<string, T[]> } {
  const timestamps = Object.values(series).flatMap((points) =>
    points.map((point) => point.t).filter(Number.isFinite)
  );
  if (!timestamps.length) return { start: 0, end: 1, series: Object.fromEntries(Object.keys(series).map((key) => [key, []])) };

  const earliest = Math.min(...timestamps);
  let end = Math.max(...timestamps);
  let start = Math.max(earliest, end - maxDurationMs);
  if (start === end) {
    start -= 30_000;
    end += 30_000;
  }

  return {
    start,
    end,
    series: Object.fromEntries(Object.entries(series).map(([key, points]) => [
      key,
      points.filter((point) => Number.isFinite(point.t) && point.t >= start && point.t <= end)
    ]))
  };
}

export function fitNumericDomain(
  values: readonly (number | null | undefined)[],
  preferred?: NumericDomain,
  paddingFraction = 0.35
): [number, number] {
  const numeric = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  const preferredIsValid = preferred && Number.isFinite(preferred[0]) && Number.isFinite(preferred[1]) && preferred[1] > preferred[0];
  const outsidePreferred = preferredIsValid && numeric.some((value) => value < preferred[0] || value > preferred[1]);

  let low: number;
  let high: number;
  if (numeric.length && (!preferredIsValid || outsidePreferred)) {
    low = Math.min(...numeric);
    high = Math.max(...numeric);
  } else if (preferredIsValid) {
    [low, high] = preferred;
  } else if (numeric.length) {
    low = Math.min(...numeric);
    high = Math.max(...numeric);
  } else {
    return [0, 1];
  }

  const baseSpan = preferredIsValid ? preferred[1] - preferred[0] : 0;
  const padding = (high - low || baseSpan || Math.max(Math.abs(low) * 0.1, 1)) * paddingFraction;
  return [low - padding, high + padding];
}

export function niceTicks(domain: NumericDomain, targetCount = 5): number[] {
  const [low, high] = domain;
  const range = high - low;
  if (!Number.isFinite(range) || range <= 0) return [low, high];

  const rawStep = range / Math.max(targetCount - 1, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const multiplier = fraction <= 1.5 ? 1 : fraction <= 2.25 ? 2 : fraction <= 3.5 ? 2.5 : fraction <= 7 ? 5 : 10;
  const step = multiplier * magnitude;
  const first = Math.ceil(low / step - 1e-10) * step;
  const ticks: number[] = [];

  for (let tick = first, count = 0; tick <= high + step * 1e-10 && count < 20; tick += step, count += 1) {
    ticks.push(Number(tick.toPrecision(12)));
  }

  return ticks;
}
