import { describe, expect, it } from "vitest";
import { buildCriticalIndicatorAlerts, buildCriticalTravoIndicatorAlerts } from "../../src/widgets/ops-eng/_shared/selectors";

describe("critical indicator alerts", () => {
  it("creates an alert for each critical live indicator instead of only its aggregated unit", () => {
    const readings = {
      "ct.ma1.temp": { key: "ct.ma1.temp", value: 42, ts: 1, trend: [] },
      "reactor.sb_ma1.temp": { key: "reactor.sb_ma1.temp", value: 40, ts: 1, trend: [] },
      "panel.phase.r.current": { key: "panel.phase.r.current", value: 180, ts: 1, trend: [] }
    };
    const alerts = buildCriticalIndicatorAlerts(readings, {
      "ct.ma1.temp": "critical",
      "reactor.sb_ma1.temp": "critical",
      "panel.phase.r.current": "neutral"
    });

    expect(alerts.map((alert) => alert.id)).toEqual([
      "indicator:ct.ma1.temp",
      "indicator:reactor.sb_ma1.temp"
    ]);
    expect(alerts[0]).toMatchObject({
      label: "Cooling Tower MA1 Suhu",
      status: "critical",
      valueText: "42,0 °C"
    });
  });

  it("keeps Travo alerts unique per unit so off-slide units are monitored independently", () => {
    const readings = {
      "panel.phase.r.voltage": { key: "panel.phase.r.voltage", value: 224, ts: 1, trend: [] }
    };
    const statuses = { "panel.phase.r.voltage": "critical" as const };

    const firstUnit = buildCriticalTravoIndicatorAlerts(1, readings, statuses);
    const fourthUnit = buildCriticalTravoIndicatorAlerts(4, readings, statuses);

    expect(firstUnit[0]).toMatchObject({
      id: "travo:1:indicator:panel.phase.r.voltage",
      group: "Travo 1",
      status: "critical"
    });
    expect(fourthUnit[0]?.id).toBe("travo:4:indicator:panel.phase.r.voltage");
  });
});
