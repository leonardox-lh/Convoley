import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { prismaCommunityRepository } from "@/modules/clubs/infrastructure/prisma-community-repository";
import { CommunityInUseError, CommunityNameTakenError } from "@/modules/clubs/domain/errors";

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

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  const club = await db.club.create({
    data: { slug: `hu09-${Date.now()}`, name: "HU-09 club" },
  });
  clubId = club.id;
});

afterAll(async () => {
  if (!db) return;
  await db.event.deleteMany({ where: { clubId } });
  await db.community.deleteMany({ where: { clubId } });
  await db.club.delete({ where: { id: clubId } });
  await db.$disconnect();
});

describe("HU-09: comunidades en la base de datos", () => {
  it("HU-09 criterio 1: crea, renombra y no repite nombres", async () => {
    const communities = prismaCommunityRepository(db);
    await communities.create(clubId, "Amateur");
    await expect(communities.create(clubId, "Amateur")).rejects.toThrow(CommunityNameTakenError);
    const [amateur] = await communities.list(clubId);
    await communities.rename(amateur!.id, "Competitivo");
    expect((await communities.list(clubId)).map((c) => c.name)).toEqual(["Competitivo"]);
  });

  it("HU-09 criterio 2: no elimina una comunidad con convocatorias", async () => {
    const communities = prismaCommunityRepository(db);
    const community = await db.community.create({ data: { clubId, name: "Con eventos" } });
    await db.event.create({
      data: {
        clubId,
        communityId: community.id,
        title: "Martes",
        startsAt: new Date("2030-12-01T01:00:00Z"),
        venueName: "Coliseo",
        priceCents: 1500,
        capacity: 12,
      },
    });
    await expect(communities.delete(community.id)).rejects.toThrow(CommunityInUseError);

    const empty = await db.community.create({ data: { clubId, name: "Vacía" } });
    await communities.delete(empty.id);
    expect((await communities.list(clubId)).map((c) => c.name)).not.toContain("Vacía");
  });
});
