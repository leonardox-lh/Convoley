import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { ClubSlugTakenError } from "@/modules/clubs/domain/errors";
import { prismaClubRepository } from "@/modules/clubs/infrastructure/prisma-club-repository";

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

const RUN_ID = Date.now();
const slug = `hu02-${RUN_ID}`;
const profile = {
  name: "HU-02 club",
  description: "Vóley los sábados",
  primaryColor: "#1d4ed8",
  secondaryColor: "#facc15",
  instagramUrl: "https://instagram.com/hu02",
  tiktokUrl: null,
  whatsappUrl: null,
  contactPhone: null,
};

let db: PrismaClient;
let userId: string;

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  userId = (await db.user.create({ data: { email: `hu02-${RUN_ID}@convoley.test` } })).id;
});

afterAll(async () => {
  if (!db) return;
  const club = await db.club.findUnique({ where: { slug } });
  if (club) {
    await db.clubMember.deleteMany({ where: { clubId: club.id } });
    await db.community.deleteMany({ where: { clubId: club.id } });
    await db.club.delete({ where: { id: club.id } });
  }
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("HU-02: prismaClubRepository", () => {
  it("HU-02: createWithAdmin crea el club, su admin y la comunidad General", async () => {
    await prismaClubRepository(db).createWithAdmin({
      slug,
      profile,
      logoKey: null,
      adminUserId: userId,
    });

    const club = await db.club.findUniqueOrThrow({
      where: { slug },
      include: { members: true, communities: { orderBy: { createdAt: "asc" } } },
    });
    expect(club).toMatchObject(profile);
    expect(club.members).toMatchObject([{ userId, role: "admin" }]);
    expect(club.communities.map((community) => community.name)).toEqual([
      "General",
      "Básico",
      "Intermedio",
      "Competitivo",
    ]);
  });

  it("HU-02: no permite el mismo link dos veces", async () => {
    await expect(
      prismaClubRepository(db).createWithAdmin({
        slug,
        profile,
        logoKey: null,
        adminUserId: userId,
      }),
    ).rejects.toThrow(ClubSlugTakenError);
  });

  it("HU-02: updateProfile edita el club y findProfile lo refleja", async () => {
    const repository = prismaClubRepository(db);
    await repository.updateProfile(slug, {
      description: "Nueva descripción",
      logoKey: "logo-1.png",
      tiktokUrl: "https://tiktok.com/@hu02",
    });

    expect(await repository.findProfile(slug)).toMatchObject({
      slug,
      name: profile.name,
      description: "Nueva descripción",
      logoKey: "logo-1.png",
      tiktokUrl: "https://tiktok.com/@hu02",
    });
  });

  it("HU-02: findProfile devuelve null si el club no existe", async () => {
    expect(await prismaClubRepository(db).findProfile(`no-existe-${RUN_ID}`)).toBeNull();
  });
});
