import { describe, expect, it } from "vitest";
import { getLayoutFromProfile, validateLayout } from "../../src/features/layout/store";

const opsLayout = {
  tab: "ops-eng",
  slides: [{ id: "slide-1", title: "Ops", rows: 1, items: [{ widgetId: "widget-a", w: 6, h: 1 }] }]
};

describe("TV layout profiles", () => {
  it("loads a valid tab layout from a profile", () => {
    expect(getLayoutFromProfile({ id: 1, name: "Plant", layouts: { "ops-eng": opsLayout } }, "ops-eng")).toEqual(opsLayout);
  });

  it("rejects missing or malformed tab layouts in a profile", () => {
    expect(getLayoutFromProfile({ id: 1, name: "Plant", layouts: {} }, "ops-eng")).toBeNull();
    expect(getLayoutFromProfile({ id: 1, name: "Plant", layouts: { "ops-eng": { tab: "other", slides: [] } } }, "ops-eng")).toBeNull();
  });

  it("validates layout tab identity and widget fit before saving", () => {
    expect(validateLayout(opsLayout, "ops-eng").ok).toBe(true);
    expect(validateLayout(opsLayout, "plant-kpi").ok).toBe(false);
    expect(validateLayout({
      tab: "ops-eng",
      slides: [{ id: "slide-1", title: "Overflow", rows: 1, items: [{ widgetId: "a", w: 12, h: 1 }, { widgetId: "b", w: 12, h: 1 }] }]
    }, "ops-eng").ok).toBe(false);
  });
});
