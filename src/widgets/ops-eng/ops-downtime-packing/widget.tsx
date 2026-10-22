"use client";

import { MonthlyListWidget } from "../_shared/monthly-parts";
import { MonthlyDetail } from "../_shared/detail";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["downtime.packing.autopack", "downtime.packing.opsol", "downtime.packing.tgm", "downtime.packing.kentex"];

export function Widget(props: WidgetProps) {
  return <MonthlyListWidget {...props} keys={keys} subtitle="% jam berhenti" />;
}
export function Detail() {
  return <MonthlyDetail keys={keys} />;
}
