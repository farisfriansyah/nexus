import type { ComponentType } from "react";

export type DashboardMode = "tv" | "analytic";
export interface WidgetProps { mode: DashboardMode; widgetId: string; title: string }
export interface WidgetDetailProps { widgetId: string; title: string }
export interface WidgetDefinition {
  id: string;
  title: string;
  /** Tab pemilik (folder widget). */
  tab: string;
  /** Tab lain yang juga boleh memakai widget ini; "*" = semua tab. */
  tabs?: string[];
  modes: DashboardMode[];
  defaultSize: { minWidth: number; minHeight: number };
  component: ComponentType<WidgetProps>;
  /** Isi drawer detail (analytic mode). */
  detail?: ComponentType<WidgetDetailProps>;
  /** PIC yang terkait, dipakai filter PIC. */
  pics?: string[];
}
