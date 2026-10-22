"use client";

import { MonthlySingleWidget } from "../_shared/monthly-parts";
import { MonthlyDetail } from "../_shared/detail";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["mttr"];

export function Widget(props: WidgetProps) {
  return <MonthlySingleWidget {...props} keys={keys} bulletMax={45} />;
}
export function Detail() {
  return <MonthlyDetail keys={keys} />;
}
