import { describe, expect, it } from "vitest";
import { tabLayoutSchema, widgetDataSchema } from "../../src/features/layout/schema";
import { packSlide, resolveLayout } from "../../src/features/layout/resolver";
import { tvLayouts } from "../../src/config/layouts/seed";

describe("layout resolver", () => {
  it("removes hidden widgets and empty slides", () => {
    const layout = tabLayoutSchema.parse({
      tab: "test",
      slides: [
        { id: "keep", title: "Keep", rows: 2, items: [{ widgetId: "a", w: 6, h: 1 }, { widgetId: "b", w: 6, h: 1 }] },
        { id: "remove", title: "Remove", rows: 1, items: [{ widgetId: "d", w: 12, h: 1 }] }
      ]
    });
    const resolved = resolveLayout(layout, new Set(["b", "d"]));
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.items).toHaveLength(1);
  });
  it("packs densely so freed space is taken over by later widgets", () => {
    const items = [{ widgetId: "a", w: 6, h: 1 }, { widgetId: "b", w: 12, h: 1 }, { widgetId: "c", w: 6, h: 1 }];
    const { placed, overflow } = packSlide(items, 2);
    expect(overflow).toHaveLength(0);
    expect(placed.map((item) => [item.widgetId, item.x, item.y])).toEqual([["a", 0, 0], ["b", 0, 1], ["c", 6, 0]]);
  });
  it("reports widgets that do not fit instead of overflowing", () => {
    const { placed, overflow } = packSlide([{ widgetId: "a", w: 12, h: 1 }, { widgetId: "b", w: 12, h: 1 }], 1);
    expect(placed).toHaveLength(1);
    expect(overflow.map((item) => item.widgetId)).toEqual(["b"]);
  });
  it("validates every seeded tab layout and fits every widget", () => {
    for (const layout of Object.values(tvLayouts)) {
      expect(tabLayoutSchema.safeParse(layout).success).toBe(true);
      for (const slide of layout.slides) expect(packSlide(slide.items, slide.rows).overflow).toHaveLength(0);
    }
  });  it("validates the empty-compatible metric contract", () => {
    expect(widgetDataSchema.safeParse({
      id: "x", title: "Widget", value: null, unit: "", target: null,
      thresholds: { warning: null, critical: null }, status: "no-data", trend: [],
      period: "", source: "", pic: null, updated_at: "2026-10-12T00:00:00.000Z", stale_after_sec: 0
    }).success).toBe(true);
  });
  it("includes energy, all phase widgets and system summary on each Travo slide", () => {
    const slides = tvLayouts["ops-eng"]?.slides.filter((item) => item.id.startsWith("travo-"));
    expect(slides?.map(({ title }) => title)).toEqual([
      "Travo 1 · Panel Listrik · Per Fasa",
      "Travo 2 · Panel Listrik · Per Fasa",
      "Travo 3 · Panel Listrik · Per Fasa",
      "Travo 4 · Panel Listrik · Per Fasa"
    ]);
    expect(slides?.map(({ items }) => items.map(({ widgetId }) => widgetId))).toEqual([
      [
        "ops-travo-energy", "ops-phase-r", "ops-phase-s", "ops-phase-t",
        "ops-phase-current", "ops-phase-voltage", "ops-cos-total", "ops-travo-summary"
      ],
      [
        "ops-travo-energy", "ops-phase-r", "ops-phase-s", "ops-phase-t",
        "ops-phase-current", "ops-phase-voltage", "ops-cos-total", "ops-travo-summary"
      ],
      [
        "ops-travo-energy", "ops-phase-r", "ops-phase-s", "ops-phase-t",
        "ops-phase-current", "ops-phase-voltage", "ops-cos-total", "ops-travo-summary"
      ],
      [
        "ops-travo-energy", "ops-phase-r", "ops-phase-s", "ops-phase-t",
        "ops-phase-current", "ops-phase-voltage", "ops-cos-total", "ops-travo-summary"
      ]
    ]);
    expect(slides?.every(({ rows }) => rows === 6)).toBe(true);
  });
});
