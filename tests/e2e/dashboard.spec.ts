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
  await expect(page.getByRole("alert")).toContainText("email organisasi yang diizinkan");
  await expect(page.getByRole("button", { name: "Masuk dengan Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: /bypass/i })).toHaveCount(0);
});

test("Google login redirects to the authorization endpoint", async ({ page }) => {
  await page.route("https://accounts.google.com/**", (route) => route.fulfill({ status: 200, body: "OAuth test" }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Masuk dengan Google" }).click();
  await expect(page).toHaveURL(/^https:\/\/accounts\.google\.com\//);
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

test("TV only mounts nearby slides and restores distant slides when navigating", async ({ page }) => {
  await page.goto("/tv/ops-eng");
  await expect(page.getByTestId("tv-canvas")).toBeVisible();
  const dots = page.getByRole("group", { name: "Pilih slide" }).getByRole("button");
  const count = await dots.count();
  test.skip(count < 8, "Requires at least eight slides in the published Ops. Eng layout");

  const slides = page.locator(".tv-slide");
  await expect(slides).toHaveCount(count);
  await expect(slides.locator(".slide-grid")).toHaveCount(7);
  for (let index = 0; index < count; index += 1) {
    await expect(slides.nth(index).locator(".slide-grid")).toHaveCount(index <= 3 || index >= count - 3 ? 1 : 0);
  }
  const firstWidgets = await slides.nth(0).locator("[data-widget-id]").count();
  expect(firstWidgets).toBeGreaterThan(0);

  await dots.nth(Math.floor(count / 2)).click();
  await expect(dots.nth(Math.floor(count / 2))).toHaveAttribute("aria-current", "true");
  await expect(slides.nth(Math.floor(count / 2)).locator("[data-widget-id]").first()).toBeVisible();
  await expect(slides.locator(".slide-grid")).toHaveCount(7, { timeout: 10_000 });
  await expect(slides.nth(0).locator(".slide-grid")).toHaveCount(0);
  const middle = Math.floor(count / 2);
  for (let index = 0; index < count; index += 1) {
    const distance = Math.min((index - middle + count) % count, (middle - index + count) % count);
    await expect(slides.nth(index).locator(".slide-grid")).toHaveCount(distance <= 3 ? 1 : 0);
  }

  await dots.nth(0).click();
  await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");
  await expect(slides.nth(0).locator("[data-widget-id]")).toHaveCount(firstWidgets);
  await expect(slides.locator(".slide-grid")).toHaveCount(7, { timeout: 10_000 });
});

test("pressure gauge shows threshold zones and a live needle", async ({ page }) => {
  await page.goto("/tv/ops-eng?scenario=normal");
  await expect(page.getByTestId("tv-canvas")).toBeVisible();
  const slides = page.locator(".tv-slide");
  const index = await slides.evaluateAll((elements) => elements.findIndex((element) => element.getAttribute("aria-label") === "Tekanan & Suhu Reaktor"));
  test.skip(index < 0, "Requires the pressure gauge slide in the published layout");
  await page.getByRole("group", { name: "Pilih slide" }).getByRole("button").nth(index).click();
  const gauge = slides.nth(index).locator('[data-widget-id="ops-pressure-gauge"] .pg-svg');
  await expect(gauge).toBeVisible();
  await expect(gauge.locator("path")).toHaveCount(5);
  await expect(gauge.locator(".pg-needle")).toHaveCount(1);
  await expect(gauge).toHaveAttribute("aria-label", /Tekanan .* bar/);

  await page.goto("/tv/ops-eng?scenario=all-nodata");
  await expect(page.getByTestId("tv-canvas")).toBeVisible();
  await page.getByRole("group", { name: "Pilih slide" }).getByRole("button").nth(index).click();
  await expect(gauge).toHaveAttribute("aria-label", /tidak ada data/i);
  await expect(gauge.locator(".pg-needle")).toHaveCount(0);
  await expect(gauge.locator("path")).toHaveCount(5);
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
