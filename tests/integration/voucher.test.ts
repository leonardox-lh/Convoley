import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { makeSubmitVoucher } from "@/modules/registrations/application/submit-voucher";

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
let eventId: string;
let submitVoucher: ReturnType<typeof makeSubmitVoucher>;
let readVoucherImage: typeof import("@/modules/payments").readVoucherImage;

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  // These modules read `db` from src/lib/db.ts at load, so they are imported after DATABASE_URL points at the test database.
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { eventsAdapter } = await import("@/modules/registrations/infrastructure/events-adapter");
  const { voucherPaymentsAdapter } =
    await import("@/modules/registrations/infrastructure/payments-adapter");
  const { prismaRegistrationRepository, prismaTransactions } =
    await import("@/modules/registrations/infrastructure/prisma-registration-repository");
  ({ readVoucherImage } = await import("@/modules/payments"));
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  submitVoucher = makeSubmitVoucher({
    events: eventsAdapter,
    registrations: prismaRegistrationRepository,
    vouchers: voucherPaymentsAdapter,
    transactions: prismaTransactions(db),
  });
  const club = await db.club.create({
    data: {
      slug: `hu14-${Date.now()}`,
      name: "HU-14 club",
      communities: { create: { name: "General" } },
    },
    include: { communities: true },
  });
  clubId = club.id;
  const event = await db.event.create({
    data: {
      clubId,
      communityId: club.communities[0]!.id,
      title: "Con voucher",
      startsAt: new Date("2030-12-10T01:00:00Z"),
      venueName: "Coliseo",
      priceCents: 1800,
      capacity: 10,
      status: "published",
    },
  });
  eventId = event.id;
});

afterAll(async () => {
  if (!db) return;
  await db.payment.deleteMany({ where: { clubId } });
  await db.registration.deleteMany({ where: { eventId } });
  await db.event.deleteMany({ where: { clubId } });
  await db.community.deleteMany({ where: { clubId } });
  await db.club.delete({ where: { id: clubId } });
  await db.$disconnect();
});

describe("HU-14: subir voucher (Postgres + S3Mock)", () => {
  it("HU-14 criterios 1, 2 y 3: guarda la captura privada, el código y pasa a en revisión", async () => {
    const registration = await db.registration.create({
      data: { eventId, firstName: "Ana", lastName: "Paz", phone: "+51987654321" },
    });
    const bytes = new Uint8Array([255, 216, 255, 1, 2, 3]);

    await submitVoucher({
      registrationId: registration.id,
      image: { bytes, contentType: "image/jpeg" },
      yapeSecurityCode: "482",
    });

    const payment = await db.payment.findFirstOrThrow({
      where: { registrationId: registration.id },
    });
    expect(payment).toMatchObject({
      method: "voucher",
      status: "in_review",
      amountCents: 1800,
      yapeSecurityCode: "482",
    });
    const stored = await readVoucherImage(payment.proofFileKey!);
    expect(new Uint8Array(await new Response(stored?.body).arrayBuffer())).toEqual(bytes);
    expect(
      (await db.registration.findUniqueOrThrow({ where: { id: registration.id } })).status,
    ).toBe("in_review");
  });
});
