// Screenshots of the demo club for the promo video. Needs `npm run dev` and `DEMO_PROMO=1 npm run seed:demo`.
// Run: npx tsx scripts/promo-screenshots.ts [outputDir]. Re-seed afterwards: it signs up a player.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium, type Page } from "@playwright/test";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });

const BASE = "http://localhost:3000";
const CLUB = "club-mania";
const OUT = process.argv[2] ?? "D:/convoley-promo/public/shots";
// Test-only credentials of the demo organizer, created by prisma/seed-demo.ts.
const ORGANIZER = { email: "carlos@demo.convoley.test", password: "convoley-demo-1234" };
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

mkdirSync(OUT, { recursive: true });

async function shot(page: Page, name: string, path: string, fullPage = true) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await capture(page, name, fullPage);
}

async function capture(page: Page, name: string, fullPage = true) {
  // Hides the Next.js dev indicator, which is not part of the app.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage });
  console.info("✓", name);
}

async function saveImage(page: Page, name: string, path: string) {
  // A dev server in a bad state can drop image responses; scripts/promo-images.tsx renders them anyway.
  const response = await page.request.get(BASE + path).catch(() => null);
  if (!response?.ok())
    return console.warn(`! ${name}: ${path} failed, use scripts/promo-images.tsx`);
  writeFileSync(join(OUT, `${name}.png`), await response.body());
  console.info("✓", name);
}

async function eventIds() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  try {
    const idOf = async (title: string) => {
      const event = await db.event.findFirst({
        where: { club: { slug: CLUB }, title, status: { not: "closed" } },
        select: { id: true },
      });
      if (!event) throw new Error(`No "${title}" event: run npm run seed:demo first.`);
      return event.id;
    };
    return { mixed: await idOf("Mixto intermedio"), live: await idOf("Competitivo") };
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const browser = await chromium.launch();
  // Skips the first-visit intro animation, which would cover the page.
  const skipIntro = "localStorage.setItem('convoley:intro-seen', '1')";
  const phone = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "es-PE",
  });
  await phone.addInitScript(skipIntro);
  const page = await phone.newPage();

  // Organizer first, to learn the event ids from the admin home.
  await page.goto(`${BASE}/ingresar`);
  await page.getByLabel("Correo").fill(ORGANIZER.email);
  await page.getByLabel("Contraseña").fill(ORGANIZER.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/admin/);
  const ids = await eventIds();
  const admin = `/admin/${CLUB}`;
  const event = (id: string) => `${admin}/convocatorias/${id}`;

  await shot(page, "admin-home", admin);
  await shot(page, "admin-event", event(ids.mixed));
  await page
    .getByText(/^En revisión \(/)
    .first()
    .click();
  await page.waitForTimeout(800);
  await page.waitForLoadState("networkidle");
  await capture(page, "admin-event-review");
  await shot(page, "admin-teams", `${event(ids.live)}/equipos`);
  await shot(page, "admin-matches", `${event(ids.live)}/partidos`);
  await shot(page, "admin-finance", `${admin}/finanzas`);
  await shot(page, "admin-recurring", `${admin}/recurrentes`);
  await shot(page, "admin-organizers", `${admin}/organizadores`);
  await shot(page, "admin-orders", `${admin}/pedidos`);
  await shot(page, "admin-store", `${admin}/tienda`);
  await shot(page, "admin-plans", `${admin}/planes`);
  await shot(page, "admin-payments", `${admin}/pagos`);
  await saveImage(page, "image-list-story", `${event(ids.mixed)}/imagen?formato=historia`);
  await saveImage(page, "image-list-post", `${event(ids.mixed)}/imagen?formato=post`);
  await saveImage(page, "image-flyer-story", `${event(ids.mixed)}/flyer?formato=historia`);
  await saveImage(page, "image-teams-story", `${event(ids.live)}/equipos/imagen?formato=historia`);
  await saveImage(
    page,
    "image-matches-story",
    `${event(ids.live)}/partidos/imagen?formato=historia`,
  );
  // Only with DEMO_PROMO=1, which plays the final.
  await saveImage(
    page,
    "image-champion-story",
    `${event(ids.live)}/partidos/imagen?formato=historia&tipo=campeon`,
  );

  // The live event's list (check-in marks) and the check-in page of one player.
  await shot(page, "admin-live-event", event(ids.live));
  const checkInPath = await page
    .$eval(`a[href*='/asistencia/']`, (a) => (a as HTMLAnchorElement).pathname)
    .catch(() => null);
  if (checkInPath) await shot(page, "admin-check-in", checkInPath);
  else console.warn("! no check-in link on the live event page");

  // Desktop: the same panel on a computer.
  const desktop = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
    locale: "es-PE",
    storageState: await phone.storageState(),
  });
  await desktop.addInitScript(skipIntro);
  const desk = await desktop.newPage();
  await shot(desk, "desktop-admin-home", admin, false);
  await shot(desk, "desktop-admin-event", event(ids.mixed), false);
  await shot(desk, "desktop-finance", `${admin}/finanzas`, false);
  await shot(desk, "desktop-club", `/${CLUB}`, false);

  // Player side, signed out.
  const player = await browser.newContext({
    viewport: PHONE,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "es-PE",
  });
  await player.addInitScript(skipIntro);
  const p = await player.newPage();
  await shot(p, "club-home", `/${CLUB}`);
  await shot(p, "club-store", `/${CLUB}/tienda`);
  await shot(p, "club-plans", `/${CLUB}/planes`);
  await shot(p, "event", `/c/${CLUB}/${ids.mixed}`);

  await p.getByRole("button", { name: "Continuar como invitado" }).click();
  await p.locator("input[name=firstName]").fill("Rafael");
  await p.locator("input[name=lastName]").fill("Pérez");
  await p.locator("input[name=phone]").fill("987654321");
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await capture(p, "event-form");
  await p.getByRole("button", { name: "Inscribirme" }).click();
  await p.waitForTimeout(4000);
  await p.waitForLoadState("networkidle");
  await capture(p, "registration");
  // The player's own sign-up page, where they pay.
  const myRegistration = await p
    .$eval("a[href*='/inscripcion/']", (a) => (a as HTMLAnchorElement).pathname)
    .catch(() => null);
  if (myRegistration) await shot(p, "registration-pay", myRegistration);
  else console.warn("! no link to the player's sign-up page");

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
