import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
// Set to a deployed URL (e.g. production) to smoke-test it instead of a local server.
const deployedUrl = process.env["PLAYWRIGHT_BASE_URL"];

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: deployedUrl ?? `http://localhost:${PORT}` },
  // Mobile-first: most players arrive from a WhatsApp link on their phone.
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: deployedUrl
    ? undefined
    : {
        command: "npm run dev",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
