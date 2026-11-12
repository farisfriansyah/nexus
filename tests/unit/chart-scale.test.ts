import { describe, expect, it } from "vitest";
import { fitNumericDomain, fitTimeWindow, niceTicks } from "../../src/widgets/_primitives/chart-scale";

describe("chart axis scaling", () => {
  it("limits multi-series chart data to a rolling 12-hour window", () => {
    const hour = 60 * 60 * 1000;
    const end = 20 * hour;
    const window = fitTimeWindow({
      current: [
        { t: end - 13 * hour, v: 10 },
        { t: end - 12 * hour, v: 20 },
        { t: end - 6 * hour, v: 30 },
        { t: end, v: 40 }
      ],
      voltage: [
        { t: end - 11 * hour, v: 230 },
        { t: end, v: 235 }
      ]
    }, 12 * hour);

    expect(window.end - window.start).toBe(12 * hour);
    expect(window.series.current.map((point) => point.v)).toEqual([20, 30, 40]);
    expect(window.series.voltage.map((point) => point.v)).toEqual([230, 235]);
  });

  it("uses the available time range when it is shorter than the maximum", () => {
    const window = fitTimeWindow({
      cos: [{ t: 1_000, v: 0.98 }, { t: 61_000, v: 0.99 }]
    }, 12 * 60 * 60 * 1000);

    expect(window.start).toBe(1_000);
    expect(window.end).toBe(61_000);
  });

  it("expands beyond a preferred domain when readings fall outside it", () => {
    const domain = fitNumericDomain([101.04, 108.24, 122.4], [160, 220]);

    expect(domain[0]).toBeLessThan(101.04);
    expect(domain[1]).toBeGreaterThan(122.4);
    expect(domain[1] - domain[0]).toBeLessThan(60);
  });

  it("keeps the preferred range when readings fit and adds visual padding", () => {
    const domain = fitNumericDomain([233.7], [230, 235]);

    expect(domain[0]).toBeLessThan(230);
    expect(domain[1]).toBeGreaterThan(235);
    expect(domain[0]).toBeCloseTo(228.25);
    expect(domain[1]).toBeCloseTo(236.75);
  });

  it("creates finite, ordered tick values for both small and large ranges", () => {
    for (const domain of [[-0.05, 1.05], [99, 124], [229.75, 235.25]] as const) {
      const ticks = niceTicks(domain);
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.every(Number.isFinite)).toBe(true);
      expect(ticks.every((tick, index) => index === 0 || tick > ticks[index - 1]!)).toBe(true);
      expect(ticks.every((tick) => tick >= domain[0] && tick <= domain[1])).toBe(true);
    }
  });

  it("returns a stable padded range for constant or missing data", () => {
    expect(fitNumericDomain([0.989], [0, 1])).toEqual([-0.35, 1.35]);
    expect(fitNumericDomain([], [0, 1])).toEqual([-0.35, 1.35]);
  });
});
