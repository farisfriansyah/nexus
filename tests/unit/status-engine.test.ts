import { describe, expect, it } from "vitest";
import { indicators, getIndicator } from "@/config/ops-eng/indicators";
import { aggregateStatus, evaluateStatus, validateBands } from "@/lib/status/engine";

describe("status engine", () => {
  const volt = getIndicator("panel.volt");
  const cosphi = getIndicator("panel.cosphi");
  const pressure = getIndicator("boiler.ma4.pressure");

  it("evaluates voltage band edges", () => {
    expect(evaluateStatus(volt, 379.9)).toBe("critical");
    expect(evaluateStatus(volt, 380)).toBe("warning");
    expect(evaluateStatus(volt, 387)).toBe("on_target");
    expect(evaluateStatus(volt, 396)).toBe("on_target");
    expect(evaluateStatus(volt, 396.1)).toBe("warning");
    expect(evaluateStatus(volt, 403)).toBe("critical");
  });

  it("evaluates cos phi and boiler pressure", () => {
    expect(evaluateStatus(cosphi, 0.79)).toBe("critical");
    expect(evaluateStatus(cosphi, 0.8)).toBe("warning");
    expect(evaluateStatus(cosphi, 0.86)).toBe("on_target");
    expect(evaluateStatus(pressure, 4.9)).toBe("on_target");
    expect(evaluateStatus(pressure, 4.95)).toBe("warning");
    expect(evaluateStatus(pressure, 4.96)).toBe("critical");
  });

  it("returns no_data for missing values", () => {
    expect(evaluateStatus(volt, null)).toBe("no_data");
    expect(evaluateStatus(volt, Number.NaN)).toBe("no_data");
  });

  it("has valid bands for all indicators", () => {
    for (const def of indicators) {
      const issues = validateBands(def.bands).filter((issue) => issue.kind === "gap" || issue.kind === "overlap");
      expect({ key: def.key, issues }).toEqual({ key: def.key, issues: [] });
    }
  });

  it("aggregates worst status", () => {
    expect(aggregateStatus(["on_target", "warning"])).toBe("warning");
    expect(aggregateStatus(["on_target", "critical", "warning"])).toBe("critical");
  });
});
