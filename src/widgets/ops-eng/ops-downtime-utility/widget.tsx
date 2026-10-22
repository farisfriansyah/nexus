"use client";

import { HeatListWidget } from "../_shared/heat-parts";
import { MonthlyDetail } from "../_shared/detail";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["downtime.utility.boiler", "downtime.utility.cooling_tower", "downtime.utility.kompresor", "downtime.utility.genset"];

export function Widget(props: WidgetProps) {
  return <HeatListWidget {...props} keys={keys} subtitle="kasus / bulan" />;
}
export function Detail() {
  return <MonthlyDetail keys={keys} />;
}
