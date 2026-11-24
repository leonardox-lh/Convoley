import { expect, test } from "@playwright/test";

test("HT-01: el proyecto corre en local y la home muestra Convoley", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "Convoley" })).toBeVisible();
});

test("HT-02: la home desplegada responde por HTTPS", async ({ page }) => {
  test.skip(!process.env["PLAYWRIGHT_BASE_URL"], "solo corre contra una URL desplegada");
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(page.url()).toMatch(/^https:\/\//);
});
