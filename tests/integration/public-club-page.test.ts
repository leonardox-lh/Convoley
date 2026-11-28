import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { LISTED_STATUSES, listedEndingAfter } from "@/modules/events/domain/event";
import { PrismaEventRepository } from "@/modules/events/infrastructure/prisma-event-repository";

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

// Reads `db` from src/lib/db.ts at load, so it is imported after DATABASE_URL points at the test database.
let countByEvent: typeof import("@/modules/registrations/infrastructure/prisma-registration-reader").countConfirmedRegistrationsByEvent;
let db: PrismaClient;
let clubId: string;
let communityId: string;
let phoneCounter = 0;

const NOW = new Date("2030-12-01T12:00:00.000Z");

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  ({ countConfirmedRegistrationsByEvent: countByEvent } =
    await import("@/modules/registrations/infrastructure/prisma-registration-reader"));
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  const club = await db.club.create({
    data: {
      slug: `hu03-${Date.now()}`,
      name: "HU-03 club",
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

type EventStatus = "draft" | "published" | "full" | "closed" | "cancelled";

function createEvent(
  title: string,
  startsAt: string,
  status: EventStatus = "published",
  endsAt?: string,
) {
  return db.event.create({
    data: {
      clubId,
      communityId,
      title,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      venueName: "Coliseo",
      priceCents: 1500,
      capacity: 18,
      status,
    },
  });
}

async function addRegistration(
  eventId: string,
  status: "pending_payment" | "in_review" | "paid" | "cancelled",
) {
  phoneCounter += 1;
  await db.registration.create({
    data: {
      eventId,
      firstName: "Ana",
      lastName: "Perez",
      phone: `+5190001${String(phoneCounter).padStart(4, "0")}`,
      status,
    },
  });
}

describe("HU-03: PrismaEventRepository.listInClub (Postgres)", () => {
  it("HU-03: lista solo published y full futuras, ordenadas por fecha", async () => {
    await createEvent("tarde", "2030-12-20T00:00:00Z");
    await createEvent("llena", "2030-12-10T00:00:00Z", "full");
    await createEvent("temprana", "2030-12-05T00:00:00Z");
    await createEvent("borrador", "2030-12-06T00:00:00Z", "draft");
    await createEvent("cerrada", "2030-12-07T00:00:00Z", "closed");
    await createEvent("cancelada", "2030-12-08T00:00:00Z", "cancelled");
    await createEvent("pasada", "2030-11-01T00:00:00Z");

    const listed = await new PrismaEventRepository(db).listInClub(clubId, {
      statuses: LISTED_STATUSES,
      endingAfter: listedEndingAfter(NOW),
    });

    expect(listed.map((e) => e.title)).toEqual(["temprana", "llena", "tarde"]);
  });

  it("sigue mostrando la convocatoria hasta 1 hora después de que termina", async () => {
    // NOW is 12:00. Each one is checked against the others already created, so filter by title.
    await createEvent("en juego", "2030-12-01T11:00:00Z", "full", "2030-12-01T13:00:00Z");
    await createEvent(
      "terminó hace 30 min",
      "2030-12-01T09:30:00Z",
      "published",
      "2030-12-01T11:30:00Z",
    );
    await createEvent(
      "terminó hace 2 horas",
      "2030-12-01T08:00:00Z",
      "published",
      "2030-12-01T10:00:00Z",
    );
    await createEvent("sin fin, empezó hace 30 min", "2030-12-01T11:30:00Z");
    await createEvent("sin fin, empezó hace 2 horas", "2030-12-01T10:00:00Z");

    const listed = await new PrismaEventRepository(db).listInClub(clubId, {
      statuses: LISTED_STATUSES,
      endingAfter: listedEndingAfter(NOW),
    });
    const titles = listed.map((e) => e.title);

    expect(titles).toContain("en juego");
    expect(titles).toContain("terminó hace 30 min");
    expect(titles).toContain("sin fin, empezó hace 30 min");
    expect(titles).not.toContain("terminó hace 2 horas");
    expect(titles).not.toContain("sin fin, empezó hace 2 horas");
  });

  it("HU-03: no mezcla convocatorias de otro club", async () => {
    const other = await db.club.create({
      data: {
        slug: `hu03-other-${Date.now()}`,
        name: "Otro",
        communities: { create: { name: "General" } },
      },
      include: { communities: true },
    });
    try {
      await db.event.create({
        data: {
          clubId: other.id,
          communityId: other.communities[0]!.id,
          title: "ajena",
          startsAt: new Date("2030-12-12T00:00:00Z"),
          venueName: "X",
          priceCents: 1000,
          capacity: 10,
          status: "published",
        },
      });
      const listed = await new PrismaEventRepository(db).listInClub(clubId, {
        statuses: LISTED_STATUSES,
        endingAfter: listedEndingAfter(NOW),
      });
      expect(listed.map((e) => e.title)).not.toContain("ajena");
    } finally {
      await db.event.deleteMany({ where: { clubId: other.id } });
      await db.community.deleteMany({ where: { clubId: other.id } });
      await db.club.delete({ where: { id: other.id } });
    }
  });
});

describe("HU-03: countConfirmedRegistrationsByEvent (Postgres)", () => {
  it("HU-03: cuenta varias convocatorias a la vez e ignora las canceladas", async () => {
    const first = await createEvent("c1", "2030-12-21T00:00:00Z");
    const second = await createEvent("c2", "2030-12-22T00:00:00Z");
    const empty = await createEvent("c3", "2030-12-23T00:00:00Z");
    await addRegistration(first.id, "paid");
    await addRegistration(first.id, "pending_payment");
    await addRegistration(first.id, "cancelled");
    await addRegistration(second.id, "in_review");
    await addRegistration(second.id, "cancelled");

    const counts = await countByEvent([first.id, second.id, empty.id]);

    expect(counts.get(first.id)).toBe(2);
    expect(counts.get(second.id)).toBe(1);
    // Events without confirmed registrations are absent; the use case treats that as 0.
    expect(counts.has(empty.id)).toBe(false);
  });

  it("HU-03: una lista vacía de ids devuelve un mapa vacío", async () => {
    expect((await countByEvent([])).size).toBe(0);
  });
});
