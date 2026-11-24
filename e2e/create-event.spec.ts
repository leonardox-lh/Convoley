import { expect, test, type Page } from "@playwright/test";

import { signInAsOrganizer } from "./helpers/login";

test.beforeEach(async ({ page }) => {
  await signInAsOrganizer(page);
});

const FORM_URL = "/admin/voley-miraflores/convocatorias/nueva";
const DAYS_AHEAD_MS = 7 * 24 * 3600 * 1000;

async function fillForm(page: Page, title: string, capacity: string) {
  const future = new Date(Date.now() + DAYS_AHEAD_MS).toISOString().slice(0, 10);
  await page.goto(FORM_URL);
  await page.getByLabel("Nombre").fill(title);
  await page.getByLabel("Fecha").fill(future);
  await page.getByLabel("Hora").fill("19:00");
  await page.getByLabel("Lugar").fill("Coliseo E2E");
  await page.getByLabel("Precio (S/)").fill("12.50");
  await page.getByLabel("Cupos").fill(capacity);
}

test("HU-04: publica una convocatoria y el link para compartir la muestra", async ({ page }) => {
  const title = `E2E ${Date.now()}`;
  await fillForm(page, title, "18");
  await page.getByRole("button", { name: "Publicar convocatoria" }).click();

  const link = page.getByLabel("Link para compartir");
  await expect(link).toBeVisible();
  const url = await link.inputValue();
  expect(url).toMatch(/\/c\/voley-miraflores\/.+/);

  await page.goto(url);
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText(/12[.,]50/)).toBeVisible();
});

test("HU-04: con cupos 0 muestra error y no crea la convocatoria", async ({ page }) => {
  await fillForm(page, `E2E cupos ${Date.now()}`, "0");
  // The browser's min=1 check would block the submit; skip it to exercise the server rule.
  await page.locator("form").evaluate((form) => form.setAttribute("novalidate", ""));
  await page.getByRole("button", { name: "Publicar convocatoria" }).click();

  await expect(page.locator("form [role=alert]")).toBeVisible();
  await expect(page.getByLabel("Link para compartir")).toHaveCount(0);
});
