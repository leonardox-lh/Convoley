import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { makeRegisterGuest } from "@/modules/registrations/application/register-guest";
import { makeRemoveRegistration } from "@/modules/registrations/application/remove-registration";

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
let removeRegistration: ReturnType<typeof makeRemoveRegistration>;

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
  const deps = {
    events: eventsAdapter,
    registrations: prismaRegistrationRepository,
    transactions: prismaTransactions(db),
  };
  registerGuest = makeRegisterGuest({ ...deps, now: () => new Date("2030-12-01T12:00:00Z") });
  removeRegistration = makeRemoveRegistration(deps);
  const club = await db.club.create({
    data: {
      slug: `hu12-${Date.now()}`,
      name: "HU-12 club",
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

const player = (eventId: string, phone: string) => ({
  eventId,
  firstName: "Jugador",
  lastName: phone,
  phone,
  userId: null,
});

describe("HU-12: lista de espera en la base de datos", () => {
  it("HU-12 criterios 1, 2 y 3: orden por llegada, promoción automática y posición", async () => {
    const event = await db.event.create({
      data: {
        clubId,
        communityId,
        title: "Lleno",
        startsAt: new Date("2030-12-10T01:00:00Z"),
        venueName: "Coliseo",
        priceCents: 1500,
        capacity: 1,
        status: "published",
      },
    });

    const seated = await registerGuest(player(event.id, "911111111"));
    const first = await registerGuest(player(event.id, "922222222"));
    const second = await registerGuest(player(event.id, "933333333"));

    expect(seated.status).toBe("pending_payment");
    expect([first.waitlistPosition, second.waitlistPosition]).toEqual([1, 2]);
    expect((await db.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe("full");

    await removeRegistration({ eventId: event.id, registrationId: seated.id });

    const statuses = await db.registration.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, status: true },
    });
    expect(statuses.map((row) => row.status)).toEqual([
      "cancelled",
      "pending_payment",
      "waitlisted",
    ]);
    // The freed seat went to the waitlist: the event is still full.
    expect((await db.event.findUniqueOrThrow({ where: { id: event.id } })).status).toBe("full");

    const { waitlistPosition } =
      await import("@/modules/registrations/infrastructure/prisma-registration-reader");
    expect(await waitlistPosition(second.id, db)).toBe(1);
  });
});
