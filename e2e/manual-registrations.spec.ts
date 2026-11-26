import { expect, test } from "@playwright/test";

import { signInToNewEvent } from "./helpers/login";
import { fillEventSchedule } from "./helpers/event-form";

const MOBILE_WIDTH = 375;
const CAPACITY = 10;

test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

function randomPhone() {
  return `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

test("HU-08 criterios 1 y 2: agregar pagado, agregar y marcar pagado manual, y quitar libera el cupo", async ({
  page,
}) => {
  await signInToNewEvent(page);
  await page.getByLabel("Nombre").fill(`E2E manual ${Date.now()}`);
  await fillEventSchedule(page);
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
    // The panel stays open after adding someone; clicking its summary again would close it.
    const panel = page.locator("details", { hasText: "Agregar jugador" });
    if ((await panel.getAttribute("open")) === null) await page.getByText("Agregar jugador").click();
    await page.getByLabel("Nombre").fill(firstName);
    await page.getByLabel("Apellido").fill("Manual");
    await page.getByLabel("Celular").fill(randomPhone());
    if (paid) await page.getByText("Pago manual", { exact: true }).click();
    await page.getByRole("button", { name: "Agregar" }).click();
    await expect(page.getByText(`${firstName} quedó inscrito.`)).toBeVisible();
  }

  await addPlayer("Paga", true);
  await expect(items.filter({ hasText: "Paga" })).toContainText("Pagado");
  await expect(counter).toContainText("1 ocupados · 9 libres");

  // Named "Debe" so the row filter doesn't also match the "Pendiente" status label.
  await addPlayer("Debe", false);
  const pending = items.filter({ hasText: "Debe" });
  await expect(pending).toContainText("Pendiente");
  await pending.getByRole("button", { name: "Marcar pagado manual" }).click();
  await expect(pending).toContainText("Pagado");
  await expect(counter).toContainText("2 ocupados · 8 libres");

  await pending.getByRole("button", { name: "Quitar a Debe" }).click();
  await page.getByRole("button", { name: "Sí, quitar" }).click();
  await expect(counter).toContainText("1 ocupados · 9 libres");
  await expect(items).toHaveCount(1);
});
