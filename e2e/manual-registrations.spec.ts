import { expect, test } from "@playwright/test";

import { signInAsOrganizer } from "./helpers/login";

const MOBILE_WIDTH = 375;
const DAYS_AHEAD_MS = 7 * 24 * 3600 * 1000;
const CAPACITY = 10;

test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

function randomPhone() {
  return `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

test("HU-08 criterios 1 y 2: agregar pagado, agregar y marcar pagado manual, y quitar libera el cupo", async ({
  page,
}) => {
  await signInAsOrganizer(page);
  await page.getByLabel("Nombre").fill(`E2E manual ${Date.now()}`);
  await page
    .getByLabel("Fecha")
    .fill(new Date(Date.now() + DAYS_AHEAD_MS).toISOString().slice(0, 10));
  await page.getByLabel("Hora").fill("19:00");
  await page.getByLabel("Lugar").fill("Coliseo E2E");
  await page.getByLabel("Precio (S/)").fill("15");
  await page.getByLabel("Cupos").fill(String(CAPACITY));
  await page.getByRole("button", { name: "Publicar convocatoria" }).click();
  const shareUrl = await page.getByLabel("Link para compartir").inputValue();
  const [, club, eventId] = new URL(shareUrl).pathname.match(/^\/c\/([^/]+)\/([^/]+)/)!;
  await page.goto(`/admin/${club}/convocatorias/${eventId}`);

  const counter = page.getByRole("status", { name: "Cupos" });
  const items = page.getByRole("list", { name: "Inscritos" }).getByRole("listitem");

  async function addPlayer(firstName: string, paid: boolean) {
    await page.getByText("Agregar jugador").click();
    await page.getByLabel("Nombre").fill(firstName);
    await page.getByLabel("Apellido").fill("Manual");
    await page.getByLabel("Celular").fill(randomPhone());
    if (paid) await page.getByLabel("Ya pagó (pagado manual)").check();
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText(`${firstName} quedó inscrito.`)).toBeVisible();
  }

  await addPlayer("Paga", true);
  await expect(items.filter({ hasText: "Paga" })).toContainText("Pagado");
  await expect(counter).toContainText("1 ocupados · 9 libres");

  await addPlayer("Pendiente", false);
  const pending = items.filter({ hasText: "Pendiente" });
  await expect(pending).toContainText("Pendiente de pago");
  await pending.getByRole("button", { name: "Marcar pagado manual" }).click();
  await expect(pending).toContainText("Pagado");
  await expect(counter).toContainText("2 ocupados · 8 libres");

  await pending.getByRole("button", { name: "Quitar a Pendiente" }).click();
  await page.getByRole("button", { name: "Sí, quitar" }).click();
  await expect(counter).toContainText("1 ocupados · 9 libres");
  await expect(items).toHaveCount(1);
});
