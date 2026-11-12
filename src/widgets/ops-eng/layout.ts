import type { LegacyLayout } from "@/config/layouts/legacy";

const col = (widgetId: string) => ({ id: widgetId, widgetId });

/**
 * Layout seed tab Ops. Eng; satu slide = satu kelompok baris bermerge di kolom "note" Excel
 * ("satu layar tampilan beda grafik - N"). Analitik memakai urutan yang sama sebagai bagian.
 */
export const opsEngLayout: LegacyLayout = {
  tab: "ops-eng",
  slides: [
    { id: "downtime-reaktor", title: "Downtime Reaktor (PVAC · Neoprene · Acrylic)", rows: [
      { id: "downtime-reaktor", height: 1, columns: ["ops-downtime-reaktor"].map(col) }
    ] },
    { id: "downtime-utility", title: "Downtime Utilitas (Boiler · Cooling Tower · Kompresor · Genset)", rows: [
      { id: "downtime-utility", height: 1, columns: ["ops-downtime-utility"].map(col) }
    ] },
    { id: "downtime-packing", title: "Downtime Packing (Autopack · Opsol · TGM · Kentex)", rows: [
      { id: "downtime-packing", height: 1, columns: ["ops-downtime-packing"].map(col) }
    ] },
    { id: "downtime-vehicle", title: "Downtime Kendaraan (Armada · Forklift)", rows: [
      { id: "downtime-vehicle", height: 1, columns: ["ops-downtime-vehicle"].map(col) }
    ] },
    { id: "maintainability", title: "MTTR & MTBF", rows: [
      { id: "maintain", height: 1, columns: ["ops-mttr", "ops-mtbf"].map(col) }
    ] },
    { id: "panel-meter", title: "Panel Listrik (Volt · Ampere · kWh · Cos φ)", rows: [
      { id: "panel-meter", height: 1, columns: ["ops-panel-meter"].map(col) }
    ] },
    { id: "cooling-boiler", title: "Cooling Tower & Boiler", rows: [
      { id: "cooling-boiler", height: 1, columns: ["ops-cooling-tower", "ops-boiler"].map(col) }
    ] },
    { id: "compressor", title: "Kompresor (Sullair · Boge · Kobelco · Hitachi)", rows: [
      { id: "compressor", height: 1, columns: ["ops-compressor-matrix"].map(col) }
    ] },
    { id: "governance", title: "Kalibrasi, Overtime, Keselamatan Kerja & Maintenance Cost", rows: [
      { id: "governance-top", height: 1, columns: ["ops-kalibrasi", "ops-overtime"].map(col) },
      { id: "governance-bottom", height: 1, columns: ["ops-safety-counter", "ops-maintenance-cost"].map(col) }
    ] },
    { id: "travo-1", title: "Travo 1 · Panel Listrik · Per Fasa", rows: [
      { id: "travo-1-energy", height: 1, columns: ["ops-travo-energy"].map(col) },
      { id: "travo-1-values", height: 2, columns: ["ops-phase-r", "ops-phase-s", "ops-phase-t"].map(col) },
      { id: "travo-1-trends", height: 2, columns: ["ops-phase-current", "ops-phase-voltage", "ops-cos-total"].map(col) },
      { id: "travo-1-summary", height: 1, columns: ["ops-travo-summary"].map(col) }
    ] },
    { id: "travo-2", title: "Travo 2 · Panel Listrik · Per Fasa", rows: [
      { id: "travo-2-energy", height: 1, columns: ["ops-travo-energy"].map(col) },
      { id: "travo-2-values", height: 2, columns: ["ops-phase-r", "ops-phase-s", "ops-phase-t"].map(col) },
      { id: "travo-2-trends", height: 2, columns: ["ops-phase-current", "ops-phase-voltage", "ops-cos-total"].map(col) },
      { id: "travo-2-summary", height: 1, columns: ["ops-travo-summary"].map(col) }
    ] },
    { id: "travo-3", title: "Travo 3 · Panel Listrik · Per Fasa", rows: [
      { id: "travo-3-energy", height: 1, columns: ["ops-travo-energy"].map(col) },
      { id: "travo-3-values", height: 2, columns: ["ops-phase-r", "ops-phase-s", "ops-phase-t"].map(col) },
      { id: "travo-3-trends", height: 2, columns: ["ops-phase-current", "ops-phase-voltage", "ops-cos-total"].map(col) },
      { id: "travo-3-summary", height: 1, columns: ["ops-travo-summary"].map(col) }
    ] },
    { id: "travo-4", title: "Travo 4 · Panel Listrik · Per Fasa", rows: [
      { id: "travo-4-energy", height: 1, columns: ["ops-travo-energy"].map(col) },
      { id: "travo-4-values", height: 2, columns: ["ops-phase-r", "ops-phase-s", "ops-phase-t"].map(col) },
      { id: "travo-4-trends", height: 2, columns: ["ops-phase-current", "ops-phase-voltage", "ops-cos-total"].map(col) },
      { id: "travo-4-summary", height: 1, columns: ["ops-travo-summary"].map(col) }
    ] },
    { id: "boiler-reactor", title: "Tekanan & Suhu Reaktor", rows: [
      { id: "pressure-reactor", height: 5, columns: ["ops-pressure-gauge", "ops-reactor-temp"].map(col) }
    ] },
    { id: "live-utility", title: "Ringkasan Status Ops. Eng", rows: [
      { id: "summary", height: 1, columns: ["ops-status-summary", "ops-monthly-attainment"].map(col) }
    ] }
  ]
};