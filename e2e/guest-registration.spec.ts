import { expect, test, type Page } from "@playwright/test";

const CLUB_SLUG = "voley-miraflores";
const MOBILE_WIDTH = 375;

// Uses the seed event "Mixto intermedio" (published, in the future). Each run signs up a new phone.
// The "Continuar con Google" button only renders with AUTH_GOOGLE_ID/SECRET set; it is not set
// locally, so that option is checked manually.
test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

function randomPhone() {
  return `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

async function openForm(page: Page) {
  await page.goto(`/${CLUB_SLUG}`);
  await page.getByRole("link", { name: /Mixto intermedio/ }).click();
  await page.getByRole("button", { name: "Continuar como invitado" }).click();
}

async function fillAndSubmit(page: Page, phone: string) {
  await page.getByLabel("Nombre").fill("Ana");
  await page.getByLabel("Apellido").fill("Perez");
  await page.getByLabel("Celular").fill(phone);
  await page.getByRole("button", { name: "Inscribirme" }).click();
}

test("HU-06 criterio 1: la página ofrece Continuar como invitado", async ({ page }) => {
  await page.goto(`/${CLUB_SLUG}`);
  await page.getByRole("link", { name: /Mixto intermedio/ }).click();
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
