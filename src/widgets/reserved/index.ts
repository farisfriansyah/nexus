import type { WidgetDefinition } from "@/features/widgets-registry/types";
import { placeholders } from "@/widgets/_shared/empty-widget";

export const reservedWidgets: WidgetDefinition[] = [
  ...placeholders("reserved", [
  ["reserved-a", "Reserved A"], ["reserved-b", "Reserved B"], ["reserved-c", "Reserved C"], ["reserved-d", "Reserved D"], ["reserved-focus", "Reserved Focus"]
])
];
