import { expect, test, type Page } from "@playwright/test";

import { signInAsOrganizer, signInToNewEvent } from "./helpers/login";
import { fillEventSchedule } from "./helpers/event-form";

const MOBILE_WIDTH = 375;
const CAPACITY = 10;

test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

let eventUrl: string;
let listUrl: string;
const phones = [randomPhone(), randomPhone()];
const names = ["Primera", "Segunda"];

function randomPhone() {
  return `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

// Players need an account to sign up themselves, so the organizer adds these two from the panel.
async function register(page: Page, firstName: string, phone: string) {
  const panel = page.locator("details", { hasText: "Agregar jugador" });
  if ((await panel.getAttribute("open")) === null) await page.getByText("Agregar jugador").click();
  await page.getByLabel("Nombre").fill(firstName);
  await page.getByLabel("Apellido").fill("Lista");
  await page.getByLabel("Celular").fill(phone);
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText(`${firstName} quedó inscrito.`)).toBeVisible();
}

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: MOBILE_WIDTH, height: 812 } });
  const page = await context.newPage();
  await signInToNewEvent(page);
  await page.getByLabel("Nombre").fill(`E2E lista ${Date.now()}`);
  await fillEventSchedule(page);
  await page.getByLabel("Lugar").fill("Coliseo E2E");
  await page.getByLabel("Precio (S/)").fill("15");
  await page.getByLabel("Cupos").fill(String(CAPACITY));
  await page.getByRole("button", { name: "Publicar convocatoria" }).click();
  eventUrl = await page.getByLabel("Link para compartir").inputValue();

  // Share link is /c/<club>/<eventId>; the organizer page is /admin/<club>/convocatorias/<eventId>.
  const [, club, eventId] = new URL(eventUrl).pathname.match(/^\/c\/([^/]+)\/([^/]+)/)!;
  listUrl = `/admin/${club}/convocatorias/${eventId}`;

  await page.goto(listUrl);
  for (const [index, phone] of phones.entries()) await register(page, names[index], phone);
  await context.close();
});

test.beforeEach(async ({ page }) => {
  await signInAsOrganizer(page);
  await page.goto(listUrl);
});

test("HU-07 criterio 1: la lista muestra los inscritos por hora de inscripción", async ({
  page,
}) => {
  const items = page.getByRole("list", { name: "Inscritos" }).getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("Primera");
  await expect(items.nth(1)).toContainText("Segunda");
});

test("HU-07 criterio 3: el contador muestra 2 ocupados · 8 libres", async ({ page }) => {
  await expect(page.getByRole("status", { name: "Cupos" })).toContainText("2 ocupados · 8 libres");
});

test("HU-07 criterio 2: filtrar por Pagado no muestra a nadie y Pendiente muestra a ambos", async ({
  page,
}) => {
  const items = page.getByRole("list", { name: "Inscritos" }).getByRole("listitem");

  await page.getByRole("link", { name: "Pagado" }).click();
  await expect(page).toHaveURL(/estado=paid/);
  await expect(items).toHaveCount(0);

  await page.getByRole("link", { name: "Pendiente" }).click();
  await expect(page).toHaveURL(/estado=pending_payment/);
  await expect(items).toHaveCount(2);
});
