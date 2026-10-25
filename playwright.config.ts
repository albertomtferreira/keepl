import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { testEnv } from "./scripts/test-env.mjs";

// Public Firebase values are frozen into the bundle. Runtime env cannot make a
// live build safe for tests; require the marker tied to the current build ID.
let testBuild = false;
try {
  testBuild =
    readFileSync(".next-test/BUILD_ID", "utf8") ===
    readFileSync(".next-test/keepl-test-build", "utf8");
} catch {
  testBuild = false;
}
if (!testBuild)
  throw new Error(
    "Run npm run build:test before browser tests; an emulator build is required.",
  );
export default defineConfig({
  testDir: "./tests/e2e",
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "webkit-mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        // WebKit on Windows can hang closing a trace with live Firebase streams.
        trace: process.platform === "win32" ? "off" : "retain-on-failure",
        screenshot: "only-on-failure",
      },
    },
  ],
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  globalTimeout: 300000,
  expect: { timeout: 15000 },
  use: {
    actionTimeout: 10000,
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    env: testEnv,
  },
});
