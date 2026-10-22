import { expect, test } from "@playwright/test";

const tabs = ["plant-kpi", "produksi-packing", "ops-eng", "reserved"];
const viewports = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 }
];

test("login explains domain denial", async ({ page }) => {
  await page.goto("/login?error=domain");
  await expect(page.getByRole("alert")).toContainText("domain");
  await expect(page.getByRole("button", { name: /Masuk/ })).toBeVisible();
});

test("TV mode does not scroll at supported resolutions on every tab and slide", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const tab of tabs) {
      await page.goto(`/tv/${tab}`);
      const dots = page.getByRole("group", { name: "Pilih slide" }).getByRole("button");
      for (let slide = 0; slide < await dots.count(); slide += 1) {
        await dots.nth(slide).click();
        await expect(dots.nth(slide)).toHaveAttribute("aria-current", "true");
        const dimensions = await page.evaluate(() => ({
          height: document.documentElement.scrollHeight,
          width: document.documentElement.scrollWidth
        }));
        expect(dimensions.height).toBeLessThanOrEqual(viewport.height);
        expect(dimensions.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  }
});

test("slide navigation supports keyboard and drag", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/tv/plant-kpi");
  const dots = page.getByRole("group", { name: "Pilih slide" }).getByRole("button");
  await page.keyboard.press("ArrowRight");
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");
  await page.mouse.move(980, 350);
  await page.mouse.down();
  await page.mouse.move(240, 350, { steps: 8 });
  await page.mouse.up();
  await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");
});

test("autoplay advances slides and can be disabled", async ({ page }) => {
  await page.goto("/tv/plant-kpi");
  await page.getByRole("button", { name: "Pengaturan TV" }).click();
  const autoplay = page.getByRole("switch", { name: /Swipe otomatis/ });
  await autoplay.click();
  await autoplay.click();
  const interval = page.getByRole("slider", { name: "Interval slide (detik)" });
  await interval.focus();
  await page.keyboard.press("Home");
  await expect(page.getByText("5 detik")).toBeVisible();
  await page.getByRole("button", { name: "Selesai" }).click();
  const dots = page.getByRole("group", { name: "Pilih slide" }).getByRole("button");
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "true", { timeout: 7000 });
  await expect(page.getByRole("button", { name: "Jeda slide" })).toBeVisible();
  await page.getByRole("button", { name: "Jeda slide" }).click();
  await expect(page.getByRole("button", { name: "Putar slide" })).toBeVisible();
});

test("hiding a widget reflows columns and persists after reload", async ({ page }) => {
  await page.goto("/tv/plant-kpi");
  const before = await page.locator('[data-widget-id="availability"]').boundingBox();
  await page.getByRole("button", { name: "Pengaturan TV" }).click();
  await page.getByRole("switch", { name: "OEE" }).click();
  await page.getByRole("button", { name: "Selesai" }).click();
  await expect(page.locator('[data-widget-id="oee"]')).toHaveCount(0);
  const after = await page.locator('[data-widget-id="availability"]').boundingBox();
  expect(after?.width).toBeGreaterThan(before?.width ?? 0);
  await page.reload();
  await expect(page.locator('[data-widget-id="oee"]')).toHaveCount(0);
});

test("dark is default and theme toggle switches to light", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Ganti ke tema terang" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
});
