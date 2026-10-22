import type { WidgetDefinition } from "@/features/widgets-registry/types";
import { placeholders } from "@/widgets/_shared/empty-widget";

export const plantKpiWidgets: WidgetDefinition[] = [
  ...placeholders("plant-kpi", [
  ["availability", "Availability"], ["performance", "Performance"], ["quality", "Quality"], ["oee", "OEE"],
  ["production-trend", "Tren Produksi"], ["downtime", "Downtime"], ["quality-trend", "Tren Kualitas"],
  ["line-status", "Status Line"], ["energy", "Energi"], ["shift-summary", "Ringkasan Shift"]
])
];
