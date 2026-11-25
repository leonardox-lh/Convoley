import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import type { makeMarkPaidManually } from "@/modules/registrations/application/mark-paid-manually";
import type { makeRemoveRegistration } from "@/modules/registrations/application/remove-registration";

config({ path: ".env.local", quiet: true });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set.");
const testUrl = new URL(TEST_DATABASE_URL);
// Guard: only ever touch a local *_test database.
if (!["localhost", "127.0.0.1"].includes(testUrl.hostname)) {
  throw new Error(`Refusing to run: host "${testUrl.hostname}" is not local.`);
}
if (!testUrl.pathname.slice(1).endsWith("_test")) {
  throw new Error("Refusing to run: database name does not end in _test.");
}

const PRICE_CENTS = 1250;

let db: PrismaClient;
let clubId: string;
let communityId: string;
let organizerId: string;
let markPaidManually: ReturnType<typeof makeMarkPaidManually>;
let removeRegistration: ReturnType<typeof makeRemoveRegistration>;

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  // These modules read `db` from src/lib/db.ts at load, so they are imported after DATABASE_URL points at the test database.
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { eventsAdapter } = await import("@/modules/registrations/infrastructure/events-adapter");
  const { paymentsAdapter } =
    await import("@/modules/registrations/infrastructure/payments-adapter");
  const { prismaRegistrationRepository, prismaTransactions } =
    await import("@/modules/registrations/infrastructure/prisma-registration-repository");
  const { makeMarkPaidManually } =
    await import("@/modules/registrations/application/mark-paid-manually");
  const { makeRemoveRegistration } =
    await import("@/modules/registrations/application/remove-registration");
  const { creditsAdapter } = await import("@/modules/registrations/infrastructure/plans-adapter");
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  const transactions = prismaTransactions(db);
  markPaidManually = makeMarkPaidManually({
    events: eventsAdapter,
    registrations: prismaRegistrationRepository,
    payments: paymentsAdapter,
    transactions,
  });
  removeRegistration = makeRemoveRegistration({
    events: eventsAdapter,
    registrations: prismaRegistrationRepository,
    credits: creditsAdapter,
    transactions,
  });
  const club = await db.club.create({
    data: {
      slug: `hu08-${Date.now()}`,
      name: "HU-08 club",
      communities: { create: { name: "General" } },
    },
    include: { communities: true },
  });
  clubId = club.id;
  communityId = club.communities[0]!.id;
  organizerId = (await db.user.create({ data: { name: "HU-08 organizer" } })).id;
});

afterAll(async () => {
  if (!db) return;
  await db.payment.deleteMany({ where: { clubId } });
  await db.registration.deleteMany({ where: { event: { clubId } } });
  await db.event.deleteMany({ where: { clubId } });
  await db.community.deleteMany({ where: { clubId } });
  await db.club.delete({ where: { id: clubId } });
  await db.user.delete({ where: { id: organizerId } });
  await db.$disconnect();
});

async function createEventWithRegistration(status: "published" | "full") {
  const event = await db.event.create({
    data: {
      clubId,
      communityId,
      title: "Mixto",
      startsAt: new Date("2030-12-06T00:00:00.000Z"),
      venueName: "Coliseo",
      priceCents: PRICE_CENTS,
      capacity: 1,
      status,
    },
  });
  const registration = await db.registration.create({
    data: {
      eventId: event.id,
      firstName: "Ana",
      lastName: "Perez",
      phone: "+51987654321",
      status: "pending_payment",
    },
  });
  return { event, registration };
}

describe("HU-08 (Postgres)", () => {
  it("HU-08 criterio 1: marcar pagado manual crea un Payment manual aprobado por el precio y deja la inscripción pagada", async () => {
    const { event, registration } = await createEventWithRegistration("published");

    await markPaidManually({
      eventId: event.id,
      registrationId: registration.id,
      reviewedByUserId: organizerId,
    });

    const payments = await db.payment.findMany({ where: { registrationId: registration.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      clubId,
      method: "manual",
      status: "approved",
      amountCents: PRICE_CENTS,
      reviewedByUserId: organizerId,
    });
    expect(
      (await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).status,
    ).toBe("paid");
  });

  it("HU-08 criterio 1: una segunda marca no crea otro pago", async () => {
    const { event, registration } = await createEventWithRegistration("published");
    const input = {
      eventId: event.id,
      registrationId: registration.id,
      reviewedByUserId: organizerId,
    };

    await markPaidManually(input);
    const second = await markPaidManually(input);

    expect(second).toEqual({ alreadyPaid: true });
    expect(await db.payment.count({ where: { registrationId: registration.id } })).toBe(1);
  });

  it("HU-08 criterio 2: quitar a alguien de una convocatoria llena cancela la inscripción y reabre la convocatoria", async () => {
    const { event, registration } = await createEventWithRegistration("full");

    await removeRegistration({ eventId: event.id, registrationId: registration.id });

    expect(
      (await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).status,
    ).toBe("cancelled");
    expect((await db.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe(
      "published",
    );
  });
});
