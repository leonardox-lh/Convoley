import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets a second checkout run its own server while another one uses 3000.
const PORT = Number(process.env["E2E_PORT"] ?? 3000);
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
        command: `npm run dev -- --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
