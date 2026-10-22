import type { TabLayout } from "@/features/layout/schema";
import { tabs } from "@/config/tabs";
import { legacyToGrid, type LegacyLayout } from "@/config/layouts/legacy";
import { opsEngLayout } from "@/widgets/ops-eng/layout";

const baseLayouts: Record<string, LegacyLayout> = {
  "plant-kpi": {
    tab: "plant-kpi",
    slides: [
      { id: "overview", title: "Ringkasan", rows: [
        { id: "kpis", height: 1, columns: ["availability", "performance", "quality", "oee"].map((widgetId) => ({ id: widgetId, widgetId })) },
        { id: "trends", height: 1, columns: [{ id: "production-trend", widgetId: "production-trend", span: 2 }, { id: "downtime", widgetId: "downtime" }, { id: "quality-trend", widgetId: "quality-trend" }] }
      ] },
      { id: "plant-health", title: "Kondisi Plant", rows: [
        { id: "status", height: 1, columns: [{ id: "line-status", widgetId: "line-status" }, { id: "energy", widgetId: "energy" }] },
        { id: "summary", height: 1, columns: [{ id: "shift-summary", widgetId: "shift-summary" }] }
      ] }
    ]
  },
  "produksi-packing": {
    tab: "produksi-packing",
    slides: [
      { id: "production", title: "Produksi", rows: [
        { id: "main", height: 2, columns: [{ id: "production-output", widgetId: "production-output", span: 2 }, { id: "plan-vs-actual", widgetId: "plan-vs-actual" }] },
        { id: "lines", height: 1, columns: [{ id: "line-a", widgetId: "line-a" }, { id: "line-b", widgetId: "line-b" }, { id: "line-c", widgetId: "line-c" }] }
      ] },
      { id: "packing", title: "Packing", rows: [
        { id: "packing-main", height: 1, columns: [{ id: "packing-output", widgetId: "packing-output" }, { id: "packing-plan", widgetId: "packing-plan" }] },
        { id: "packing-detail", height: 1, columns: [{ id: "packing-line-1", widgetId: "packing-line-1" }, { id: "packing-line-2", widgetId: "packing-line-2" }, { id: "packing-line-3", widgetId: "packing-line-3" }, { id: "packing-line-4", widgetId: "packing-line-4" }] }
      ] }
    ]
  },
  "ops-eng": opsEngLayout,
  reserved: {
    tab: "reserved",
    slides: [
      { id: "reserved-one", title: "Reserved", rows: [
        { id: "reserved-grid", height: 1, columns: ["reserved-a", "reserved-b", "reserved-c", "reserved-d"].map((widgetId) => ({ id: widgetId, widgetId })) }
      ] },
      { id: "reserved-two", title: "Reserved", rows: [
        { id: "reserved-focus", height: 1, columns: [{ id: "reserved-focus", widgetId: "reserved-focus" }] }
      ] }
    ]
  }
};

export const tvLayouts = Object.fromEntries(
  tabs.map(({ slug }) => [slug, legacyToGrid(baseLayouts[slug]!)])
) as Record<string, TabLayout>;

/** Analitik tetap memakai susunan baris/kolom bawaan (tidak ikut layout editor TV). */
export const analyticLayouts = Object.fromEntries(tabs.map(({ slug }) => [slug, baseLayouts[slug]!])) as Record<string, LegacyLayout>;
