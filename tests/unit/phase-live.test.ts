import { describe, expect, it } from "vitest";
import { createLiveSimulator, TICK_MS, TREND_POINTS } from "../../src/mocks/ops-eng/live";

const phaseKeys = [
  "panel.phase.r.voltage", "panel.phase.r.current",
  "panel.phase.s.voltage", "panel.phase.s.current",
  "panel.phase.t.voltage", "panel.phase.t.current",
  "panel.cos_total"
];

describe("per-phase live simulator", () => {
  it("provides dummy readings and trend history for every split widget", () => {
    const simulator = createLiveSimulator("normal", Date.now() - 60_000);
    const readings = simulator.snapshot();

    for (const key of phaseKeys) {
      const reading = readings.find((item) => item.key === key);
      expect(reading?.value).not.toBeNull();
      expect(reading?.trend).toHaveLength(TREND_POINTS);
    }
  });

  it("updates each reading on the live tick interval", () => {
    expect(TICK_MS).toBe(2000);
    const simulator = createLiveSimulator("normal", Date.now() - 60_000);
    const ticks = simulator.tick();

    expect(ticks.filter((tick) => phaseKeys.includes(tick.key))).toHaveLength(phaseKeys.length);
    expect(ticks.every((tick) => tick.ts > 0)).toBe(true);
  });
});
