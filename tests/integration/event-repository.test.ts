import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
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

let db: PrismaClient;
let clubId: string;
let communityId: string;

beforeAll(async () => {
  // Idempotent: brings the test database to the current schema if it is not yet.
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  const club = await db.club.create({
    data: {
      slug: `hu04-${Date.now()}`,
      name: "HU-04 club",
      communities: { create: { name: "General" } },
    },
    include: { communities: true },
  });
  clubId = club.id;
  communityId = club.communities[0]!.id;
});

afterAll(async () => {
  if (!db) return;
  await db.event.deleteMany({ where: { clubId } });
  await db.community.deleteMany({ where: { clubId } });
  await db.club.delete({ where: { id: clubId } });
  await db.$disconnect();
});

const baseEvent = () => ({
  clubId,
  communityId,
  title: "Mixto",
  startsAt: new Date("2026-12-06T00:00:00.000Z"),
  venueName: "Coliseo",
  mapsUrl: null,
  priceCents: 1250,
  capacity: 18,
  isMixed: true,
  rules: null,
  status: "published" as const,
});

describe("HU-04: PrismaEventRepository", () => {
  it("HU-04: guarda y lee una convocatoria con centimos y fecha UTC", async () => {
    const repo = new PrismaEventRepository(db);
    const { id } = await repo.create(baseEvent());

    const found = await repo.findInClub(clubId, id);
    expect(found).toMatchObject({
      id,
      priceCents: 1250,
      capacity: 18,
      status: "published",
      communityName: "General",
    });
    expect(found?.startsAt.toISOString()).toBe("2026-12-06T00:00:00.000Z");
  });

  it("HU-04: findInClub no devuelve eventos de otro club", async () => {
    const repo = new PrismaEventRepository(db);
    const { id } = await repo.create({ ...baseEvent(), status: "draft" });
    expect(await repo.findInClub("otro-club", id)).toBeNull();
  });
});
