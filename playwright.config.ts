import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_SECRET: "test-secret-do-not-use-in-production",
      AUTH_TRUST_HOST: "true",
      AUTH_GOOGLE_ID: "test-google-client-id",
      AUTH_GOOGLE_SECRET: "test-google-client-secret",
      AUTH_E2E_BYPASS: "1"
    }
  }
});
