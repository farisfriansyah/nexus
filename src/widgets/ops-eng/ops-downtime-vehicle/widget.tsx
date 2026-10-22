"use client";

import { HeatListWidget } from "../_shared/heat-parts";
import { MonthlyDetail } from "../_shared/detail";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["downtime.vehicle.armada", "downtime.vehicle.forklift"];

export function Widget(props: WidgetProps) {
  return <HeatListWidget {...props} keys={keys} subtitle="kasus / bulan" />;
}
export function Detail() {
  return <MonthlyDetail keys={keys} />;
}
