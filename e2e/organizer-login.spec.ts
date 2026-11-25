import { expect, test, type Page } from "@playwright/test";
import { SEED_ORGANIZER, signInAsOrganizer } from "./helpers/login";

const NEW_EVENT_PATH = "/admin/voley-miraflores/convocatorias/nueva";
const PASSWORD = "clave-e2e-1234";

async function signUp(page: Page) {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@convoley.test`;
  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Ana E2E");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  return email;
}

test("HU-01: registro con correo nuevo termina en crear club", async ({ page }) => {
  await signUp(page);
  await expect(page).toHaveURL(/\/club\/nuevo/);
  await expect(page.getByRole("heading", { name: "Crea tu club" })).toBeVisible();
});

test("HU-01: login con correo y contraseña lleva al inicio de su club", async ({ page }) => {
  await signInAsOrganizer(page);
  await expect(page.getByRole("link", { name: "Nueva convocatoria" })).toBeVisible();
});

test("HU-01: contraseña errada muestra el error y conserva el correo", async ({ page }) => {
  await page.goto("/ingresar");
  // Another email than the seed's: the in-memory limiter (5 tries per email) would otherwise lock the seed organizer for the other specs.
  const email = "nadie-login-e2e@convoley.test";
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("clave-equivocada-1");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.locator("form [role=alert]")).toHaveText("Correo o contraseña incorrectos.");
  await expect(page.getByLabel("Correo")).toHaveValue(email);
});

test("HU-01: sin sesión, Nueva convocatoria redirige a /ingresar", async ({ page }) => {
  await page.goto(NEW_EVENT_PATH);
  await expect(page).toHaveURL(/\/ingresar/);
});

test("HU-01: un usuario sin membresía en el club recibe 404", async ({ page }) => {
  await signUp(page);
  await expect(page).toHaveURL(/\/club\/nuevo/);
  await page.goto(NEW_EVENT_PATH);
  // The page streams inside Suspense, so the status is already 200 when notFound() fires.
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nueva convocatoria" })).toHaveCount(0);
});

test("HU-01: recuperar contraseña muestra el mensaje genérico", async ({ page }) => {
  await page.goto("/recuperar");
  await page.getByLabel("Correo").fill("nadie-e2e@convoley.test");
  await page.getByRole("button", { name: "Enviarme el link" }).click();
  await expect(page.getByText(/Si ese correo tiene cuenta/)).toBeVisible();
});

test("HU-01: un link de recuperación falso dice que no es válido", async ({ page }) => {
  await page.goto("/recuperar/token-falso");
  await page.getByLabel("Nueva contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText(/ya se usó o no es válido/)).toBeVisible();
});
