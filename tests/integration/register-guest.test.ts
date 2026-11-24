import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { makeRegisterGuest } from "@/modules/registrations/application/register-guest";
import { DuplicateRegistrationError, EventFullError } from "@/modules/registrations/domain/errors";

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

let db: PrismaClient;
let clubId: string;
let communityId: string;
let registerGuest: ReturnType<typeof makeRegisterGuest>;

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  // These modules read `db` from src/lib/db.ts at load, so they are imported after DATABASE_URL points at the test database.
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { eventsAdapter } = await import("@/modules/registrations/infrastructure/events-adapter");
  const { prismaRegistrationRepository, prismaTransactions } =
    await import("@/modules/registrations/infrastructure/prisma-registration-repository");
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  registerGuest = makeRegisterGuest({
    events: eventsAdapter,
    registrations: prismaRegistrationRepository,
    transactions: prismaTransactions(db),
    now: () => new Date("2030-12-01T12:00:00.000Z"),
  });
  const club = await db.club.create({
    data: {
      slug: `hu06-${Date.now()}`,
      name: "HU-06 club",
      communities: { create: { name: "General" } },
    },
    include: { communities: true },
  });
  clubId = club.id;
  communityId = club.communities[0]!.id;
});

afterAll(async () => {
  if (!db) return;
  await db.registration.deleteMany({ where: { event: { clubId } } });
  await db.event.deleteMany({ where: { clubId } });
  await db.community.deleteMany({ where: { clubId } });
  await db.club.delete({ where: { id: clubId } });
  await db.$disconnect();
});

function createEvent(capacity: number) {
  return db.event.create({
    data: {
      clubId,
      communityId,
      title: "Mixto",
      startsAt: new Date("2030-12-06T00:00:00.000Z"),
      venueName: "Coliseo",
      priceCents: 1250,
      capacity,
      status: "published",
    },
  });
}

const guest = (eventId: string, phone: string) => ({
  eventId,
  firstName: "Ana",
  lastName: "Perez",
  phone,
  userId: null,
});

describe("HU-06 (Postgres)", () => {
  it("HU-06 criterio 4: guarda la inscripción pending_payment con celular normalizado y sin usuario", async () => {
    const event = await createEvent(18);

    const { id, status } = await registerGuest(guest(event.id, "987 654 321"));

    expect(status).toBe("pending_payment");
    const row = await db.registration.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({
      eventId: event.id,
      phone: "+51987654321",
      status: "pending_payment",
      userId: null,
    });
  });

  it("HU-06 criterio 3: no permite el mismo celular dos veces en la misma convocatoria", async () => {
    const event = await createEvent(18);
    await registerGuest(guest(event.id, "987654321"));

    await expect(registerGuest(guest(event.id, "+51 987-654-321"))).rejects.toThrow(
      DuplicateRegistrationError,
    );
    expect(await db.registration.count({ where: { eventId: event.id } })).toBe(1);
  });

  it("HU-06: reactiva la inscripción cancelada del mismo celular", async () => {
    const event = await createEvent(18);
    const { id } = await registerGuest(guest(event.id, "987654321"));
    await db.registration.update({ where: { id }, data: { status: "cancelled" } });

    const again = await registerGuest(guest(event.id, "987654321"));

    expect(again.id).toBe(id);
    expect((await db.registration.findUniqueOrThrow({ where: { id } })).status).toBe(
      "pending_payment",
    );
  });

  it("HU-06: con cupo 1 y dos inscripciones simultáneas, solo una entra y el evento queda full", async () => {
    const event = await createEvent(1);

    const results = await Promise.allSettled([
      registerGuest(guest(event.id, "911111111")),
      registerGuest(guest(event.id, "922222222")),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toBeInstanceOf(EventFullError);
    expect(await db.registration.count({ where: { eventId: event.id } })).toBe(1);
    expect((await db.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe("full");
  });
});
