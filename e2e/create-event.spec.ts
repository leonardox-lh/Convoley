import { expect, test, type Page } from "@playwright/test";

import { signInAsOrganizer } from "./helpers/login";
import { fillEventSchedule } from "./helpers/event-form";

test.beforeEach(async ({ page }) => {
  await signInAsOrganizer(page);
});

const FORM_URL = "/admin/voley-miraflores/convocatorias/nueva";

async function fillForm(page: Page, title: string, capacity: string) {
  await page.goto(FORM_URL);
  await page.getByLabel("Nombre").fill(title);
  await fillEventSchedule(page);
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
