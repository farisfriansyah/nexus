import { describe, expect, it } from "vitest";
import { configForTravoUnit, travoUnitForSlideId } from "../../src/features/travo/config";
import { formatTravoValue, isTravoReadingStale } from "../../src/features/travo/format";
import { travoMetricValue } from "../../src/features/travo/live";
import { travoApiPayloadSchema } from "../../src/features/travo/schema";
import { ENERGY_FIELDS, SUMMARY_FIELDS, formatTotalField } from "../../src/features/travo/overview";

const payload = {
  rawWeight: {
    energy: "291244,80", pt: "76.70", pft: "0.989 L", freq: "49.94", dem: "76.70",
    l1: { v: "233.7", i: "101.04", kw: "23.39", pf: "0.990", vl: "-1.18", vbar: "86.6", ibar: "100.0" },
    l2: { v: "233.7", i: "108.24", kw: "24.76", pf: "0.979", vl: "4.69", vbar: "86.6", ibar: "100.0" },
    l3: { v: "233.7", i: "122.40", kw: "28.54", pf: "0.997", vl: "0.70", vbar: "86.6", ibar: "100.0" },
    Zpt: "76.70", Zqt: "4.21", Zst: "77.50", imbalance: "10.7"
  },
  processedWeight: {
    energy: "291244,80", pt: "76.70", pft: "0.989 L", freq: "49.94", dem: "76.70",
    l1: { v: "233.7", i: "101.04", kw: "23.39", pf: "0.990", vl: "-1.18", vbar: "86.6", ibar: "100.0" },
    l2: { v: "233.7", i: "108.24", kw: "24.76", pf: "0.979", vl: "4.69", vbar: "86.6", ibar: "100.0" },
    l3: { v: "233.7", i: "122.40", kw: "28.54", pf: "0.997", vl: "0.70", vbar: "86.6", ibar: "100.0" },
    Zpt: "76.70", Zqt: "4.21", Zst: "77.50", imbalance: "10.7"
  },
  timestamp: "2026-11-09T14:24:10+07:00"
};

describe("Travo live data", () => {
  it("maps units to the first four ordered TRAVO port records", () => {
    const configs = [
      { machineId: "T1-TRAVO", listenerApiPort: "8221" },
      { machineId: "T2-TRAVO", listenerApiPort: "8231" },
      { machineId: "T3-TRAVO", listenerApiPort: "8241" },
      { machineId: "T4-TRAVO", listenerApiPort: "8251" }
    ];
    expect(configForTravoUnit(configs, 1)).toEqual(configs[0]);
    expect(configForTravoUnit(configs, 4)).toEqual(configs[3]);
    expect(configForTravoUnit(configs, 0)).toBeNull();
    expect(configForTravoUnit(configs, 5)).toBeNull();
  });

  it("keeps Travo identity for current and legacy per-phase slide IDs", () => {
    expect([1, 2, 3, 4].map((unit) => travoUnitForSlideId(`travo-${unit}`))).toEqual([1, 2, 3, 4]);
    expect([1, 2, 3, 4].map((unit) => travoUnitForSlideId(`phase-monitor-reactor-${unit}`))).toEqual([1, 2, 3, 4]);
    expect(travoUnitForSlideId("phase-monitor")).toBeNull();
  });

  it("validates the API payload shape from both weight sources", () => {
    expect(travoApiPayloadSchema.safeParse(payload).success).toBe(true);
    expect(travoApiPayloadSchema.safeParse({ ...payload, processedWeight: {} }).success).toBe(false);
  });

  it("formats decimal-comma, decimal-point and suffix values for Indonesian display", () => {
    expect(formatTravoValue("291244,80", 2)).toBe("291.244,80");
    expect(formatTravoValue("233.7", 1)).toBe("233,7");
    expect(formatTravoValue("0.989 L", 3)).toBe("0,989 L");
    expect(formatTravoValue("unavailable", 2)).toBe("unavailable");
  });

  it("maps energy and system summary fields to the API's actual values", () => {
    const weight = travoApiPayloadSchema.parse(payload).processedWeight;
    expect(ENERGY_FIELDS.map((field) => formatTotalField(weight, field))).toEqual(["291.244,80", "76,70", "0,989 L", "49,94", "76,70"]);
    expect(SUMMARY_FIELDS.map((field) => formatTotalField(weight, field))).toEqual(["76,70", "4,21", "77,50", "10,7"]);
  });

  it("maps the existing six phase-monitor widget sources to processed Travo readings", () => {
    const parsed = travoApiPayloadSchema.parse(payload);
    expect(travoMetricValue(parsed.processedWeight, "panel.phase.r.voltage")).toBe(233.7);
    expect(travoMetricValue(parsed.processedWeight, "panel.phase.r.current")).toBe(101.04);
    expect(travoMetricValue(parsed.processedWeight, "panel.phase.s.voltage")).toBe(233.7);
    expect(travoMetricValue(parsed.processedWeight, "panel.phase.s.current")).toBe(108.24);
    expect(travoMetricValue(parsed.processedWeight, "panel.phase.t.voltage")).toBe(233.7);
    expect(travoMetricValue(parsed.processedWeight, "panel.phase.t.current")).toBe(122.4);
    expect(travoMetricValue(parsed.processedWeight, "panel.cos_total")).toBe(0.989);
    expect(travoMetricValue(parsed.processedWeight, "unknown")).toBeNull();
  });

  it("marks invalid and expired API timestamps stale", () => {
    const now = Date.parse("2026-11-09T07:00:00.000Z");
    expect(isTravoReadingStale("2026-11-09T06:59:50.000Z", now)).toBe(false);
    expect(isTravoReadingStale("2026-11-09T06:59:00.000Z", now)).toBe(true);
    expect(isTravoReadingStale("invalid", now)).toBe(true);
  });
});
