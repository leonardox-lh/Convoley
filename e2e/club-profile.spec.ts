import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "clave-e2e-1234";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
// 1x1 transparent PNG.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg==",
  "base64",
);

// Mobile-first: the club owner may edit from the phone too.
test.use({ viewport: { width: 375, height: 812 } });

async function signUp(page: Page) {
  const email = `e2e-club-${Date.now()}-${Math.floor(Math.random() * 1e6)}@convoley.test`;
  await page.goto("/registro");
  await page.getByLabel("Tu nombre").fill("Ana Club E2E");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/club\/nuevo/);
}

test("HU-02: crear club con logo, ver su página pública y editarlo después", async ({ page }) => {
  await signUp(page);
  const clubName = `Club ${Date.now().toString(36)}`;
  const slug = clubName.toLowerCase().replace(/\s+/g, "-");

  await page.getByLabel("Nombre del club").fill(clubName);
  await page.getByLabel(/^Logo/).setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await page.getByRole("button", { name: "Crear club" }).click();

  // Criterion 1: unique link.
  await expect(page).toHaveURL(new RegExp(`/admin/${slug}/perfil`));
  await expect(page.getByText("¡Tu club está listo!")).toBeVisible();

  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { name: clubName })).toBeVisible();
  const logo = page.getByRole("img", { name: `Logo de ${clubName}` });
  await expect(logo).toBeVisible();
  const logoSrc = await logo.getAttribute("src");
  expect(logoSrc).toMatch(/^\/logos\//);
  expect((await page.request.get(logoSrc!)).status()).toBe(200);

  // Criterion 3: editable at any time.
  const description = "Jugamos todos los sábados en Miraflores";
  await page.goto(`/admin/${slug}/perfil`);
  await page.getByLabel(/^Descripción/).fill(description);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.goto(`/${slug}`);
  await expect(page.getByText(description)).toBeVisible();
});

test("HU-02: un logo de más de 2 MB muestra el error y no se envía", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("Nombre del club").fill(`Club ${Date.now().toString(36)}`);
  await page.getByLabel(/^Logo/).setInputFiles({
    name: "grande.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(MAX_LOGO_BYTES + 1),
  });
  await page.getByRole("button", { name: "Crear club" }).click();

  await expect(page.getByText("El logo debe pesar hasta 2 MB.")).toBeVisible();
  await expect(page).toHaveURL(/\/club\/nuevo/);
});

test("HU-02: un link que ya existe se rechaza", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("Nombre del club").fill("Vóley Miraflores");
  await page.getByRole("button", { name: "Crear club" }).click();
  await expect(page.locator("form [role=alert]")).toBeVisible();
  await expect(page).toHaveURL(/\/club\/nuevo/);
});
