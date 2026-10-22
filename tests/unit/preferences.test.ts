import { describe, expect, it } from "vitest";
import { migratePreferences, PREFERENCES_VERSION, createPreferencesStore } from "../../src/features/preferences/store";

describe("preferences", () => {
  it("uses versioned persistence and default settings", () => {
    expect(PREFERENCES_VERSION).toBe(2);
    const store = createPreferencesStore("user@mikatasa.com");
    expect(store.getState().intervalSeconds).toBe(15);
    expect(store.getState().autoplay).toBe(true);
  });
  it("clamps interval to supported range", () => {
    const store = createPreferencesStore("user@mikatasa.com");
    store.getState().setIntervalSeconds(500);
    expect(store.getState().intervalSeconds).toBe(120);
    store.getState().setIntervalSeconds(1);
    expect(store.getState().intervalSeconds).toBe(5);
  });
  it("toggles widgets separately by mode and tab", () => {
    const store = createPreferencesStore("user@mikatasa.com");
    store.getState().toggleWidget("tv", "plant-kpi", "oee");
    expect(store.getState().hiddenTv["plant-kpi"]).toEqual(["oee"]);
    expect(store.getState().hiddenAnalytic["plant-kpi"]).toBeUndefined();
  });
  it("migrates version 1 preferences while keeping analytics defaults separate", () => {
    const migrated = migratePreferences({ autoplay: false, intervalSeconds: 22, hiddenTv: { a: ["oee"] } }, 1, "user@mikatasa.com");
    expect(migrated.autoplay).toBe(false);
    expect(migrated.intervalSeconds).toBe(22);
    expect(migrated.hiddenTv).toEqual({ a: ["oee"] });
    expect(migrated.hiddenAnalytic).toEqual({});
    expect(migrated.email).toBe("user@mikatasa.com");
  });
});
