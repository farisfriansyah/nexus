"use client";

import type { DashboardMode } from "@/features/widgets-registry/types";
import { MonthlyListWidget } from "./monthly-parts";

/** Aset kasus/bulan: kartu per aset (batang + tren) dengan total YTD. */
export function HeatListWidget(props: { mode: DashboardMode; widgetId: string; title: string; keys: string[]; subtitle?: string }) {
  return <MonthlyListWidget {...props} showYtd />;
}
