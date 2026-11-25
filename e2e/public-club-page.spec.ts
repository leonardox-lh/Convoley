import { expect, test } from "@playwright/test";

const CLUB_SLUG = "voley-miraflores";
const MOBILE_WIDTH = 375;

// Mobile-first: players arrive from a WhatsApp link. No sign-in anywhere in this file.
// Relies on the seed event, dated two weeks after the seed ran; reseed if it is gone.
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
  await expect(card).toContainText(/\d+ cupos? libres? de \d+|Llena/);
  await expect(card).toContainText(/\d{1,2} de \p{L}+ de \d{4}/u);
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

for (const path of ["/Voley-Miraflores", "/ab"]) {
  test(`HU-03: un slug no normalizado o inválido (${path}) responde 404`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  });
}

test("HU-03: las rutas de la app y los archivos no pasan por el chequeo del club", async ({
  page,
}) => {
  expect((await page.goto("/registro"))?.status()).toBe(200);
  expect((await page.request.get("/favicon.ico")).status()).toBe(200);
});
