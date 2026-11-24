import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

config({ path: ".env.local", quiet: true });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set.");
const testUrl = new URL(TEST_DATABASE_URL);
const testDatabaseName = testUrl.pathname.slice(1);
// Guard: this suite wipes the public schema, so it may only touch a local *_test database.
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
if (!LOCAL_HOSTS.includes(testUrl.hostname)) {
  throw new Error(`Refusing to run: host "${testUrl.hostname}" is not local.`);
}
if (!testDatabaseName.endsWith("_test")) {
  throw new Error(`Refusing to run: "${testDatabaseName}" does not end in _test.`);
}

const childEnv = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
const run = (command: string) =>
  execSync(command, { env: childEnv, cwd: process.cwd(), encoding: "utf8", stdio: "pipe" });

const clientFor = (url: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function ensureTestDatabaseExists() {
  const adminUrl = new URL(TEST_DATABASE_URL!);
  adminUrl.pathname = "/postgres";
  const admin = clientFor(adminUrl.toString());
  try {
    const found = await admin.$queryRaw<{ datname: string }[]>`
      SELECT datname FROM pg_database WHERE datname = ${testDatabaseName}`;
    // Name is validated above (ends with _test); quoted because identifiers can't be parameters.
    if (found.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${testDatabaseName}"`);
  } finally {
    await admin.$disconnect();
  }
}

let db: PrismaClient;

const countAll = async () => ({
  clubs: await db.club.count(),
  communities: await db.community.count(),
  events: await db.event.count(),
  registrations: await db.registration.count(),
  registrationsWithUser: await db.registration.count({ where: { userId: { not: null } } }),
  payments: await db.payment.count(),
  products: await db.product.count(),
  variants: await db.productVariant.count(),
  orders: await db.order.count(),
});

beforeAll(async () => {
  await ensureTestDatabaseExists();
  db = clientFor(TEST_DATABASE_URL!);
  await db.$executeRawUnsafe("DROP SCHEMA public CASCADE");
  await db.$executeRawUnsafe("CREATE SCHEMA public");
});

afterAll(async () => {
  await db?.$disconnect();
});

describe("HT-03 criterio 1: migraciones versionadas", () => {
  it("HT-03: migrate deploy sobre base vacia aplica la migracion init", async () => {
    expect(() => run("npx prisma migrate deploy")).not.toThrow();
    const rows = await db.$queryRaw<{ migration_name: string; finished_at: Date | null }[]>`
      SELECT migration_name, finished_at FROM _prisma_migrations`;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.migration_name.endsWith("_init"))).toBe(true);
    expect(rows.every((row) => row.finished_at !== null)).toBe(true);
  });

  it("HT-03: migrate status dice que la base esta al dia", () => {
    expect(run("npx prisma migrate status")).toMatch(/up to date/i);
  });
});

describe("HT-03 criterio 2: datos de prueba (seed)", () => {
  const expectedCounts = {
    clubs: 1,
    communities: 1,
    events: 1,
    registrations: 3,
    registrationsWithUser: 1,
    payments: 2,
    products: 2,
    variants: 4,
    orders: 1,
  };

  it("HT-03: el seed carga los datos esperados", async () => {
    expect(() => run("npx prisma db seed")).not.toThrow();
    expect(await countAll()).toEqual(expectedCounts);
  });

  it("HT-03: el seed es idempotente (correrlo de nuevo no duplica)", async () => {
    expect(() => run("npx prisma db seed")).not.toThrow();
    expect(await countAll()).toEqual(expectedCounts);
  });
});

describe("HT-03: reglas de la base de datos", () => {
  it("HT-03: un Payment sin registrationId ni orderId falla (CHECK)", async () => {
    const club = await db.club.findFirstOrThrow();
    await expect(
      db.payment.create({ data: { clubId: club.id, amountCents: 1500, method: "voucher" } }),
    ).rejects.toThrow();
  });

  it("HT-03: un Payment con registrationId y orderId a la vez falla (CHECK)", async () => {
    const registration = await db.registration.findFirstOrThrow();
    const order = await db.order.findFirstOrThrow();
    await expect(
      db.payment.create({
        data: {
          clubId: order.clubId,
          registrationId: registration.id,
          orderId: order.id,
          amountCents: 1500,
          method: "voucher",
        },
      }),
    ).rejects.toThrow();
  });

  it("HT-03: una Registration con phone sin formato +519XXXXXXXX falla (CHECK)", async () => {
    const event = await db.event.findFirstOrThrow();
    await expect(
      db.registration.create({
        data: { eventId: event.id, firstName: "A", lastName: "B", phone: "987654321" },
      }),
    ).rejects.toThrow();
  });

  it("HT-03: no permite el mismo celular dos veces en el mismo evento (unique)", async () => {
    const existing = await db.registration.findFirstOrThrow();
    await expect(
      db.registration.create({
        data: {
          eventId: existing.eventId,
          firstName: "Dup",
          lastName: "Licado",
          phone: existing.phone,
        },
      }),
    ).rejects.toThrow();
  });
});

describe("HT-03 criterio 3: modelo documentado", () => {
  it("HT-03: docs/MODELO_DATOS.md existe y menciona cada model del schema", () => {
    expect(existsSync("docs/MODELO_DATOS.md")).toBe(true);
    const doc = readFileSync("docs/MODELO_DATOS.md", "utf8");
    const models = [...readFileSync("prisma/schema.prisma", "utf8").matchAll(/^model (\w+)/gm)].map(
      (match) => match[1],
    );
    expect(models.length).toBeGreaterThan(0);
    // Each model must appear as code (`Name`), not just as a word in prose.
    const missing = models.filter((name) => !doc.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });
});
