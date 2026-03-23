import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: path.resolve(process.cwd(), "..", ".playwright-artifacts"),
  fullyParallel: false,
  workers: 2,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1",
    env: {
      ...process.env,
      E2E_AUTH_BYPASS: "true",
    },
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
  },
});
