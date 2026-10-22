import { GRID_COLS, tabLayoutSchema, type TabLayout } from "@/features/layout/schema";

/** Format seed lama: baris (tinggi relatif) berisi kolom (span relatif). */
export type LegacyLayout = {
  tab: string;
  slides: { id: string; title: string; rows: { id: string; height: number; columns: { id: string; widgetId: string | null; span?: number }[] }[] }[];
};

/** Mengubah seed baris/kolom menjadi grid 12 kolom: tinggi baris → jumlah baris, span → lebar. */
export function legacyToGrid(legacy: LegacyLayout): TabLayout {
  return tabLayoutSchema.parse({
    tab: legacy.tab,
    slides: legacy.slides.map((slide) => ({
      id: slide.id,
      title: slide.title,
      rows: slide.rows.reduce((sum, row) => sum + row.height, 0),
      items: slide.rows.flatMap((row) => {
        const total = row.columns.reduce((sum, column) => sum + (column.span ?? 1), 0);
        return row.columns.flatMap((column) => column.widgetId
          ? [{ widgetId: column.widgetId, w: Math.max(1, Math.round(GRID_COLS * (column.span ?? 1) / total)), h: row.height }]
          : []);
      })
    }))
  });
}
