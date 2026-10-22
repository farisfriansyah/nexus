import { z } from "zod";

export const GRID_COLS = 12;
export const MAX_ROWS = 6;
/** Pilihan lebar widget (dalam 12 kolom). */
export const WIDTH_PRESETS = [
  { w: 3, label: "\u00BC" }, { w: 4, label: "\u2153" }, { w: 6, label: "\u00BD" }, { w: 8, label: "\u2154" }, { w: 12, label: "Penuh" }
] as const;

export const itemSchema = z.object({
  widgetId: z.string().min(1),
  w: z.number().int().min(1).max(GRID_COLS),
  h: z.number().int().min(1).max(MAX_ROWS)
});

export const slideSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rows: z.number().int().min(1).max(MAX_ROWS),
  items: z.array(itemSchema)
}).refine((slide) => slide.items.every((item) => item.h <= slide.rows), { message: "Tinggi widget melebihi jumlah baris slide" });

export const tabLayoutSchema = z.object({
  tab: z.string().min(1),
  slides: z.array(slideSchema).min(1)
});

export type LayoutItem = z.infer<typeof itemSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type TabLayout = z.infer<typeof tabLayoutSchema>;
export const widgetDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  value: z.number().nullable(),
  unit: z.string(),
  target: z.number().nullable(),
  thresholds: z.object({ warning: z.number().nullable(), critical: z.number().nullable() }),
  status: z.enum(["on-target", "warning", "critical", "no-data", "neutral"]),
  trend: z.array(z.number()),
  period: z.string(),
  source: z.string(),
  pic: z.string().nullable(),
  updated_at: z.string().datetime(),
  stale_after_sec: z.number().nonnegative()
});

export type WidgetData = z.infer<typeof widgetDataSchema>;

