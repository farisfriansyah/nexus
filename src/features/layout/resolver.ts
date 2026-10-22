import type { LegacyLayout } from "@/config/layouts/legacy";
import { GRID_COLS, type LayoutItem, type Slide, type TabLayout } from "@/features/layout/schema";

export type PlacedItem = LayoutItem & { x: number; y: number };
export type PackResult = { placed: PlacedItem[]; overflow: LayoutItem[]; usedCells: number; totalCells: number };

/**
 * Menempatkan widget berurutan pada grid 12 × rows (setara grid-auto-flow: dense):
 * tiap widget mengambil posisi pertama yang muat, sehingga ruang kosong diisi widget berikutnya.
 * Widget yang tidak muat dikembalikan di `overflow` dan tidak pernah dirender.
 */
export function packSlide(items: readonly LayoutItem[], rows: number): PackResult {
  const occupied = Array.from({ length: rows }, () => new Array<boolean>(GRID_COLS).fill(false));
  const placed: PlacedItem[] = [];
  const overflow: LayoutItem[] = [];
  let usedCells = 0;
  for (const item of items) {
    let spot: { x: number; y: number } | null = null;
    for (let y = 0; y + item.h <= rows && !spot; y += 1) {
      for (let x = 0; x + item.w <= GRID_COLS && !spot; x += 1) {
        let free = true;
        for (let dy = 0; dy < item.h && free; dy += 1) {
          for (let dx = 0; dx < item.w; dx += 1) if (occupied[y + dy]![x + dx]) { free = false; break; }
        }
        if (free) spot = { x, y };
      }
    }
    if (!spot) { overflow.push(item); continue; }
    for (let dy = 0; dy < item.h; dy += 1) for (let dx = 0; dx < item.w; dx += 1) occupied[spot.y + dy]![spot.x + dx] = true;
    usedCells += item.w * item.h;
    placed.push({ ...item, ...spot });
  }
  return { placed, overflow, usedCells, totalCells: rows * GRID_COLS };
}

export function resolveLayout(layout: TabLayout, hiddenWidgetIds: ReadonlySet<string>): Slide[] {
  return layout.slides.flatMap((slide) => {
    const items = slide.items.filter((item) => !hiddenWidgetIds.has(item.widgetId));
    return items.length ? [{ ...slide, items }] : [];
  });
}

/** Resolver susunan baris/kolom bawaan (dipakai halaman Analitik). */
export function resolveLegacyLayout(layout: LegacyLayout, hiddenWidgetIds: ReadonlySet<string>): LegacyLayout["slides"] {
  return layout.slides.flatMap((slide) => {
    const rows = slide.rows.flatMap((row) => {
      const columns = row.columns.filter((column) => !column.widgetId || !hiddenWidgetIds.has(column.widgetId));
      return columns.length ? [{ ...row, columns }] : [];
    });
    return rows.length ? [{ ...slide, rows }] : [];
  });
}