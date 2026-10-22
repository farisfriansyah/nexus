import type { WidgetDefinition } from "@/features/widgets-registry/types";
import { placeholders } from "@/widgets/_shared/empty-widget";

export const produksiPackingWidgets: WidgetDefinition[] = [
  ...placeholders("produksi-packing", [
  ["production-output", "Output Produksi"], ["plan-vs-actual", "Rencana vs Aktual"], ["line-a", "Line A"], ["line-b", "Line B"], ["line-c", "Line C"],
  ["packing-output", "Output Packing"], ["packing-plan", "Rencana Packing"], ["packing-line-1", "Packing Line 1"], ["packing-line-2", "Packing Line 2"],
  ["packing-line-3", "Packing Line 3"], ["packing-line-4", "Packing Line 4"]
])
];
