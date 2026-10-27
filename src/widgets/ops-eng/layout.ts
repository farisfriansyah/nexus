import type { LegacyLayout } from "@/config/layouts/legacy";

const col = (widgetId: string) => ({ id: widgetId, widgetId });

/** Layout seed tab Ops. Eng; analytic memakai urutan yang sama sebagai bagian. */
export const opsEngLayout: LegacyLayout = {
  tab: "ops-eng",
  slides: [
    { id: "live-utility", title: "Live Utility", rows: [
      { id: "summary", height: 1, columns: ["ops-status-summary", "ops-monthly-attainment", "ops-safety-counter"].map(col) },
      { id: "live", height: 3, columns: ["ops-panel-meter", "ops-cooling-tower", "ops-boiler", "ops-compressor-matrix"].map(col) }
    ] },
    { id: "downtime", title: "Downtime", rows: [
      { id: "downtime-top", height: 3, columns: ["ops-downtime-reaktor", "ops-downtime-packing"].map(col) },
      { id: "downtime-bottom", height: 2, columns: ["ops-downtime-utility", "ops-downtime-vehicle"].map(col) }
    ] },
    { id: "maintainability", title: "Maintainability & Governance", rows: [
      { id: "maintain-top", height: 3, columns: ["ops-mttr", "ops-mtbf"].map(col) },
      { id: "maintain-bottom", height: 2, columns: ["ops-kalibrasi", "ops-overtime", "ops-maintenance-cost"].map(col) }
          ] },
          { id: "boiler-reactor", title: "Tekanan & Suhu Reaktor", rows: [
            { id: "pressure-reactor", height: 5, columns: ["ops-pressure-gauge", "ops-reactor-temp"].map(col) }
          ] },
          { id: "phase-monitor", title: "Panel Listrik · Per Fasa", rows: [
            { id: "phase-values", height: 2, columns: ["ops-phase-r", "ops-phase-s", "ops-phase-t"].map(col) },
            { id: "phase-trends", height: 3, columns: ["ops-phase-current", "ops-phase-voltage", "ops-cos-total"].map(col) }
          ] }
  ]
};
