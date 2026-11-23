import { expect, test } from "@playwright/test";

test("shows current alerts and updates shared notification status", async ({ page }) => {
  let isRead = false;
  await page.route("**/api/notifications**", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      expect(body).toEqual({ selection: [42], field: "isRead", value: true });
      isRead = true;
      await route.fulfill({ json: { count: 1 } });
      return;
    }
    await route.fulfill({ json: {
      unread: isRead ? 0 : 1,
      active: [{ unit: 1, key: "panel.phase.r.voltage", label: "L1 Tegangan Fasa-N", observedAt: "2026-11-23T02:00:00Z" }],
      items: [{ id: 42, label: "L1 Tegangan Fasa-N", unit: 1, value: 224, unitLabel: "V", observedAt: "2026-11-23T02:00:00Z", isRead, isResolved: false }],
      nextCursor: null
    } });
  });
  await page.route("**/api/travo/**", (route) => route.fulfill({ status: 503, json: { error: "Test" } }));
  await page.route("**/api/indicator-thresholds", (route) => route.fulfill({ json: { indicators: [] } }));
  await page.goto("http://localhost:3000/analytics/notifications");
  await expect(page.getByRole("heading", { name: "Semua notifikasi alert" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Pilih L1 Tegangan Fasa-N" })).toBeVisible();
  await page.getByRole("button", { name: /Notifikasi/ }).click();
  await expect(page.getByText("Indikator merah saat ini")).toBeVisible();
  await expect(page.getByText("Travo 1 · Bahaya")).toBeVisible();
  await page.getByRole("link", { name: "Lihat semua" }).click();
  await page.getByRole("checkbox", { name: "Pilih L1 Tegangan Fasa-N" }).check();
  await page.getByRole("button", { name: "Tandai sudah dibaca" }).click();
  await expect(page.getByText("Status notifikasi diperbarui.")).toBeVisible();
  await expect(page.getByText("Sudah dibaca", { exact: true })).toBeVisible();
  await expect(page.getByText("Belum teratasi", { exact: true })).toBeVisible();
});

test("confirms updates affecting all pages on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let updates = 0;
  await page.route("**/api/notifications**", async (route) => {
    if (route.request().method() === "PATCH") {
      expect(route.request().postDataJSON()).toEqual({ selection: "all", field: "isResolved", value: true });
      updates += 1;
      await route.fulfill({ json: { count: 1 } });
      return;
    }
    await route.fulfill({ json: {
      unread: 1, active: [],
      items: [{ id: 1, label: "Tegangan", unit: 1, value: 224, unitLabel: "V", observedAt: "2026-11-23T02:00:00Z", isRead: false, isResolved: updates > 0 }],
      nextCursor: null
    } });
  });
  await page.route("**/api/travo/**", (route) => route.fulfill({ status: 503, json: { error: "Test" } }));
  await page.route("**/api/indicator-thresholds", (route) => route.fulfill({ json: { indicators: [] } }));
  await page.goto("http://localhost:3000/analytics/notifications");
  await expect(page.getByRole("checkbox", { name: "Pilih Tegangan" })).toBeVisible();
  await page.getByLabel("Cakupan").selectOption("all");
  await page.getByRole("button", { name: "Tandai teratasi" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("seluruh riwayat");
  await page.getByRole("button", { name: "Batal" }).click();
  expect(updates).toBe(0);
  await page.getByRole("button", { name: "Tandai teratasi" }).click();
  await page.getByRole("button", { name: "Ya, perbarui semua" }).click();
  await expect(page.getByText("Teratasi", { exact: true })).toBeVisible();
  expect(updates).toBe(1);
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
});
