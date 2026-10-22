import { defineWidget } from "@/widgets/_shared/define";
import type { WidgetDefinition } from "@/features/widgets-registry/types";

type Options = Omit<Parameters<typeof defineWidget>[0], "tab">;

/** Pembungkus definisi widget Ops. Eng supaya tiap folder cukup satu pemanggilan. */
export function defineOpsWidget(options: Options): WidgetDefinition {
  return defineWidget({ ...options, tab: "ops-eng" });
}
