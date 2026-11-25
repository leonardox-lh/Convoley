import type { Page } from "@playwright/test";

const DAYS_AHEAD_MS = 7 * 24 * 3600 * 1000;
const MAX_MONTHS_TO_ADVANCE = 2;

/** Picks a day in the calendar of the date field labelled `label`. */
export async function pickDate(page: Page, label: string, isoDate: string) {
  await page.getByRole("button", { name: label }).click();
  const day = page.locator(`[data-date="${isoDate}"]`);
  for (let month = 0; month < MAX_MONTHS_TO_ADVANCE && !(await day.isVisible()); month++) {
    await page.getByRole("button", { name: "Mes siguiente" }).click();
  }
  await day.click();
}

/** Sets the clock of the time field labelled `label`; `minute` must be a multiple of 5. */
export async function pickTime(page: Page, label: string, hour24: number, minute: number) {
  await page.getByRole("button", { name: label }).click();
  const clock = page.getByRole("dialog", { name: label });
  await clock.getByRole("button", { name: hour24 >= 12 ? "p. m." : "a. m.", exact: true }).click();
  await clock.getByRole("button", { name: `${hour24 % 12 || 12} horas`, exact: true }).click();
  await clock.getByRole("button", { name: `${minute} minutos`, exact: true }).click();
  await clock.getByRole("button", { name: "Listo" }).click();
}

/** A week from now, 7:00 to 9:00 p. m. */
export async function fillEventSchedule(page: Page) {
  await pickDate(page, "Fecha", new Date(Date.now() + DAYS_AHEAD_MS).toISOString().slice(0, 10));
  await pickTime(page, "Hora de inicio", 19, 0);
  await pickTime(page, "Hora de fin", 21, 0);
}
