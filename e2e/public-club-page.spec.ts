import { expect, test } from "@playwright/test";

const CLUB_SLUG = "voley-miraflores";
const MOBILE_WIDTH = 375;

// Mobile-first: players arrive from a WhatsApp link. No sign-in anywhere in this file.
// Relies on the seed event (2026-12-05); it stops being listed once that date passes.
test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

test("HU-03: sin cuenta se ven las convocatorias con fecha, lugar, precio y cupos", async ({
  page,
}) => {
  const response = await page.goto(`/${CLUB_SLUG}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 2, name: "Convocatorias" })).toBeVisible();

  const card = page.getByRole("link", { name: /Mixto intermedio/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Coliseo Manuel Bonilla");
  await expect(card).toContainText(/S\/\s?15/);
  await expect(card).toContainText(/Quedan \d+ cupos|Queda 1 cupo|Llena/);
  await expect(card).toContainText(/dic/i);
});

test("HU-03: en 375px no hay scroll horizontal", async ({ page }) => {
  await page.goto(`/${CLUB_SLUG}`);
  await expect(page.getByRole("link", { name: /Mixto intermedio/ })).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(MOBILE_WIDTH);
});

test("HU-03: tocar una convocatoria lleva a su página", async ({ page }) => {
  await page.goto(`/${CLUB_SLUG}`);
  await page.getByRole("link", { name: /Mixto intermedio/ }).click();
  await expect(page).toHaveURL(new RegExp(`/c/${CLUB_SLUG}/[^/]+$`));
});

test("HU-03: un club que no existe responde 404", async ({ page }) => {
  const response = await page.goto("/no-existe-club-xyz");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("No encontramos esta página")).toBeVisible();
});

test("HU-03: una convocatoria que no existe responde 404", async ({ page }) => {
  const response = await page.goto(`/c/${CLUB_SLUG}/no-existe`);
  expect(response?.status()).toBe(404);
});
