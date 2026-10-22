"use client";

import { MonthlySingleWidget } from "../_shared/monthly-parts";
import { MonthlyDetail } from "../_shared/detail";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["maintenance_cost"];

/** Target belum ditetapkan: tampil netral tanpa zona status. */
export function Widget(props: WidgetProps) {
  return <MonthlySingleWidget {...props} keys={keys} />;
}
export function Detail() {
  return <MonthlyDetail keys={keys} />;
}
