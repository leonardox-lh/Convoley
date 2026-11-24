import { expect, test } from "@playwright/test";

test("HT-01: el proyecto corre en local y la home muestra Convoley", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "Convoley" })).toBeVisible();
});
