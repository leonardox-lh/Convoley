import { expect, test, type Page } from "@playwright/test";

import { signInAsOrganizer } from "./helpers/login";

const MOBILE_WIDTH = 375;
const DAYS_AHEAD_MS = 7 * 24 * 3600 * 1000;

// Each run publishes its own event, so repeated runs never fill up a shared seed event.
// The "Continuar con Google" button only renders with AUTH_GOOGLE_ID/SECRET set; it is not set
// locally, so that option is checked manually.
test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

let eventUrl: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAsOrganizer(page);
  await page.getByLabel("Nombre").fill(`E2E inscripción ${Date.now()}`);
  await page
    .getByLabel("Fecha")
    .fill(new Date(Date.now() + DAYS_AHEAD_MS).toISOString().slice(0, 10));
  await page.getByLabel("Hora").fill("19:00");
  await page.getByLabel("Lugar").fill("Coliseo E2E");
  await page.getByLabel("Precio (S/)").fill("15");
  await page.getByLabel("Cupos").fill("10");
  await page.getByRole("button", { name: "Publicar convocatoria" }).click();
  eventUrl = await page.getByLabel("Link para compartir").inputValue();
  await context.close();
});

function randomPhone() {
  return `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

async function openForm(page: Page) {
  await page.goto(eventUrl);
  await page.getByRole("button", { name: "Continuar como invitado" }).click();
}

async function fillAndSubmit(page: Page, phone: string) {
  await page.getByLabel("Nombre").fill("Ana");
  await page.getByLabel("Apellido").fill("Perez");
  await page.getByLabel("Celular").fill(phone);
  await page.getByRole("button", { name: "Inscribirme" }).click();
}

test("HU-06 criterio 1: la página ofrece Continuar como invitado", async ({ page }) => {
  await page.goto(eventUrl);
  await expect(page.getByRole("button", { name: "Continuar como invitado" })).toBeVisible();
});

test("HU-06 criterio 2: como invitado se pide nombre, apellido y celular, sin contraseña", async ({
  page,
}) => {
  await openForm(page);
  await expect(page.getByLabel("Celular")).toBeVisible();
  await expect(page.getByLabel(/contraseña/i)).toHaveCount(0);
});

test("HU-06 criterio 2: un celular inválido muestra el error en español", async ({ page }) => {
  await openForm(page);
  await fillAndSubmit(page, "12345");
  await expect(
    page.getByText("Escribe un celular peruano de 9 dígitos que empiece con 9."),
  ).toBeVisible();
});

test("HU-06 criterios 3 y 4: inscribe como pendiente de pago y rechaza el mismo celular", async ({
  page,
}) => {
  const phone = randomPhone();
  await openForm(page);
  await fillAndSubmit(page, phone);
  await expect(page.getByText("Pendiente de pago")).toBeVisible();

  await openForm(page);
  await fillAndSubmit(page, phone);
  await expect(page.getByText("Ese celular ya está inscrito")).toBeVisible();
});
