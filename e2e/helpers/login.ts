import { expect, type Page } from "@playwright/test";

// Matches SEED_ORGANIZER_PASSWORD in prisma/seed.ts.
export const SEED_ORGANIZER = { email: "organizer@convoley.test", password: "convoley-dev-1234" };

export async function signInAsOrganizer(page: Page) {
  await page.goto("/ingresar");
  await page.getByLabel("Correo").fill(SEED_ORGANIZER.email);
  await page.getByLabel("Contraseña").fill(SEED_ORGANIZER.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin\/voley-miraflores\/convocatorias\/nueva/);
}
