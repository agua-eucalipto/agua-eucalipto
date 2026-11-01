import { defineConfig } from "@playwright/test";

const puerto = 5181;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: "line",
  outputDir: "test-results",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: `http://127.0.0.1:${puerto}`,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "retain-on-failure",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "375",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "1280",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${puerto} --strictPort`,
    url: `http://127.0.0.1:${puerto}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
