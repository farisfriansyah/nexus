import type { WidgetDefinition } from "./types";
import { plantKpiWidgets } from "@/widgets/plant-kpi";
import { produksiPackingWidgets } from "@/widgets/produksi-packing";
import { reservedWidgets } from "@/widgets/reserved";
import { opsEngWidgets } from "@/widgets/ops-eng";

export type { DashboardMode, WidgetDefinition, WidgetProps } from "./types";
export { EmptyWidget } from "@/widgets/_shared/empty-widget";

/** Menambah widget: buat folder di src/widgets/<tab>/<widget>, daftarkan di index tab. */
export const widgetRegistry: WidgetDefinition[] = [...plantKpiWidgets, ...produksiPackingWidgets, ...opsEngWidgets, ...reservedWidgets];

const byId = new Map(widgetRegistry.map((widget) => [widget.id, widget]));

/** Widget yang boleh dipakai pada tab: milik tab itu, atau dibagikan lewat `tabs`. */
export function widgetsForTab(tab: string): WidgetDefinition[] {
  return widgetRegistry.filter((widget) => widget.tab === tab || widget.tabs?.includes(tab) || widget.tabs?.includes("*"));
}

export function getWidget(widgetId: string) {
  return byId.get(widgetId);
}
