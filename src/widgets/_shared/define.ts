import type { WidgetDefinition } from "@/features/widgets-registry/types";

type Options = Pick<WidgetDefinition, "id" | "title" | "tab" | "tabs" | "component" | "detail" | "pics"> & { size?: WidgetDefinition["defaultSize"] };

/** Pembungkus definisi widget untuk tab mana pun. `tabs` = tab lain yang boleh memakai widget ini. */
export function defineWidget({ size, ...rest }: Options): WidgetDefinition {
  return { modes: ["tv", "analytic"], defaultSize: size ?? { minWidth: 220, minHeight: 140 }, ...rest };
}
