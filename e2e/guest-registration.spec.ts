import { expect, test } from "@playwright/test";

import { signInAsOrganizer, signInToNewEvent } from "./helpers/login";
import { fillEventSchedule } from "./helpers/event-form";

const MOBILE_WIDTH = 375;

// Each run publishes its own event, so repeated runs never fill up a shared seed event.
// The "Continuar con Google" button only renders with AUTH_GOOGLE_ID/SECRET set; it is not set
// locally, so that option is checked manually.
test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

let eventUrl: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInToNewEvent(page);
  await page.getByLabel("Nombre").fill(`E2E inscripción ${Date.now()}`);
  await fillEventSchedule(page);
  await page.getByLabel("Lugar").fill("Coliseo E2E");
  await page.getByLabel("Precio (S/)").fill("15");
  await page.getByLabel("Cupos").fill("10");
  await page.getByRole("button", { name: "Publicar convocatoria" }).click();
  eventUrl = await page.getByLabel("Link para compartir").inputValue();
  await context.close();
});

test("sin sesión, la convocatoria pide iniciar sesión y no ofrece invitado", async ({ page }) => {
  await page.goto(eventUrl);
  await expect(page.getByText("Inicia sesión para unirte a esta convocatoria.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar como invitado" })).toHaveCount(0);
});

test("con sesión, se inscribe como pendiente de pago", async ({ page }) => {
  await signInAsOrganizer(page);
  await page.goto(eventUrl);
  await page.getByRole("button", { name: "Inscribirme" }).click();
  await expect(page.getByText("Pendiente de pago")).toBeVisible();
});
