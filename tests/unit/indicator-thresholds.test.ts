import { describe, expect, it } from "vitest";
import { indicators } from "../../src/config/ops-eng/indicators";
import { validateIndicatorBands } from "../../src/features/indicator-thresholds/schema";
import { band } from "../../src/config/ops-eng/indicators";

describe("indicator threshold ranges", () => {
  it("accepts every current indicator default as a database baseline", () => {
    for (const indicator of indicators) {
      expect(validateIndicatorBands(indicator.bands), indicator.key).toMatchObject({ ok: true });
    }
  });

  it("requires complete, non-overlapping ranges", () => {
    expect(validateIndicatorBands([
      band("on_target", null, 10, false, true),
      band("warning", 11, null, false, false)
    ]).ok).toBe(false);
    expect(validateIndicatorBands([
      band("on_target", null, 10, false, true),
      band("warning", 10, null, true, false)
    ]).ok).toBe(false);
  });

  it("allows an empty range list to disable status evaluation", () => {
    expect(validateIndicatorBands([])).toEqual({ ok: true, bands: [] });
  });
});
