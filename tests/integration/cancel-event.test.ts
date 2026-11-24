import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { makeCancelEvent } from "@/modules/events/application/cancel-event";
import { makeUpdateEvent } from "@/modules/events/application/update-event";
import type { ClubReader, PaymentsMarker } from "@/modules/events/application/ports";
import { CapacityBelowConfirmedError } from "@/modules/events/domain/errors";
import { PrismaEventRepository } from "@/modules/events/infrastructure/prisma-event-repository";
import {
  prismaTransactions,
  toPrismaTx,
} from "@/modules/events/infrastructure/prisma-transactions";

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

// These modules read `db` from src/lib/db.ts at load, so they are imported after DATABASE_URL points at the test database.
let markPaymentsForCancellation: typeof import("@/modules/payments/infrastructure/prisma-payment-marker").markPaymentsForCancellation;
let countConfirmedRegistrations: typeof import("@/modules/registrations/infrastructure/prisma-registration-reader").countConfirmedRegistrations;
let listEventRegistrationIds: typeof import("@/modules/registrations/infrastructure/prisma-registration-reader").listEventRegistrationIds;
let db: PrismaClient;
let clubId: string;
let clubSlug: string;
let communityId: string;
let phoneCounter = 0;

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  ({ markPaymentsForCancellation } =
    await import("@/modules/payments/infrastructure/prisma-payment-marker"));
  ({ countConfirmedRegistrations, listEventRegistrationIds } =
    await import("@/modules/registrations/infrastructure/prisma-registration-reader"));
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
  clubSlug = `hu05-${Date.now()}`;
  const club = await db.club.create({
    data: { slug: clubSlug, name: "HU-05 club", communities: { create: { name: "General" } } },
    include: { communities: true },
  });
  clubId = club.id;
  communityId = club.communities[0]!.id;
});

afterAll(async () => {
  if (!db) return;
  await db.payment.deleteMany({ where: { clubId } });
  await db.registration.deleteMany({ where: { event: { clubId } } });
  await db.event.deleteMany({ where: { clubId } });
  await db.community.deleteMany({ where: { clubId } });
  await db.club.delete({ where: { id: clubId } });
  await db.$disconnect();
});

async function createEvent(capacity = 18) {
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

async function addRegistration(
  eventId: string,
  status: "pending_payment" | "in_review" | "paid" | "cancelled",
  payment?: {
    status: "pending" | "in_review" | "approved" | "rejected";
    cancellationOutcome?: "refund" | "balance";
  },
) {
  phoneCounter += 1;
  const registration = await db.registration.create({
    data: {
      eventId,
      firstName: "Ana",
      lastName: "Perez",
      phone: `+5190000${String(phoneCounter).padStart(4, "0")}`,
      status,
    },
  });
  if (!payment) return { registrationId: registration.id, paymentId: null };
  const created = await db.payment.create({
    data: {
      clubId,
      registrationId: registration.id,
      amountCents: 1250,
      method: "voucher",
      status: payment.status,
      cancellationOutcome: payment.cancellationOutcome ?? null,
    },
  });
  return { registrationId: registration.id, paymentId: created.id };
}

const clubs: ClubReader = {
  findBySlug: async (slug) =>
    slug === clubSlug
      ? {
          id: clubId,
          slug: clubSlug,
          name: "HU-05 club",
          communities: [{ id: communityId, name: "General" }],
        }
      : null,
};

function buildCancelEvent(payments?: PaymentsMarker) {
  return makeCancelEvent({
    clubs,
    events: new PrismaEventRepository(db),
    registrations: {
      countConfirmed: (eventId, tx) =>
        countConfirmedRegistrations(eventId, tx ? toPrismaTx(tx) : undefined),
      listIds: (eventId, tx) => listEventRegistrationIds(eventId, toPrismaTx(tx)),
    },
    payments: payments ?? {
      markForCancellation: async (input, tx) => {
        await markPaymentsForCancellation(input, toPrismaTx(tx));
      },
    },
    transactions: prismaTransactions(db),
    now: () => new Date("2030-12-01T12:00:00.000Z"),
  });
}

describe("HU-05 criterio 3: cancelar marca los pagos (Postgres)", () => {
  it("HU-05: solo los pagos approved e in_review sin marcar quedan con el outcome", async () => {
    const event = await createEvent();
    const approved = await addRegistration(event.id, "paid", { status: "approved" });
    const inReview = await addRegistration(event.id, "in_review", { status: "in_review" });
    const pending = await addRegistration(event.id, "pending_payment", { status: "pending" });
    const rejected = await addRegistration(event.id, "pending_payment", { status: "rejected" });
    const alreadyMarked = await addRegistration(event.id, "paid", {
      status: "approved",
      cancellationOutcome: "refund",
    });

    await buildCancelEvent()({ clubSlug, eventId: event.id, outcome: "balance" });

    const outcomeOf = async (paymentId: string | null) =>
      (await db.payment.findUniqueOrThrow({ where: { id: paymentId! } })).cancellationOutcome;
    expect(await outcomeOf(approved.paymentId)).toBe("balance");
    expect(await outcomeOf(inReview.paymentId)).toBe("balance");
    expect(await outcomeOf(pending.paymentId)).toBeNull();
    expect(await outcomeOf(rejected.paymentId)).toBeNull();
    expect(await outcomeOf(alreadyMarked.paymentId)).toBe("refund");

    const cancelled = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledAt?.toISOString()).toBe("2030-12-01T12:00:00.000Z");
    expect(cancelled.cancellationOutcome).toBe("balance");
  });

  it("HU-05: marcar pagos es idempotente (la segunda vez no cambia nada)", async () => {
    const event = await createEvent();
    const { registrationId } = await addRegistration(event.id, "paid", { status: "approved" });
    const input = { registrationIds: [registrationId], outcome: "refund" as const };

    expect(await markPaymentsForCancellation(input, db)).toBe(1);
    expect(await markPaymentsForCancellation({ ...input, outcome: "balance" }, db)).toBe(0);
    const payment = await db.payment.findFirstOrThrow({ where: { registrationId } });
    expect(payment.cancellationOutcome).toBe("refund");
  });

  it("HU-05: si el marcado falla, el evento no queda cancelado (rollback)", async () => {
    const event = await createEvent();
    const { paymentId } = await addRegistration(event.id, "paid", { status: "approved" });
    const failingAfterWrite: PaymentsMarker = {
      markForCancellation: async (input, tx) => {
        await markPaymentsForCancellation(input, toPrismaTx(tx));
        throw new Error("boom");
      },
    };

    await expect(
      buildCancelEvent(failingAfterWrite)({ clubSlug, eventId: event.id, outcome: "refund" }),
    ).rejects.toThrow("boom");

    const after = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after).toMatchObject({
      status: "published",
      cancelledAt: null,
      cancellationOutcome: null,
    });
    const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId! } });
    expect(payment.cancellationOutcome).toBeNull();
  });
});

describe("HU-05 criterio 1: cupos y confirmados (Postgres)", () => {
  it("HU-05: countConfirmedRegistrations no cuenta las canceladas", async () => {
    const event = await createEvent();
    await addRegistration(event.id, "pending_payment");
    await addRegistration(event.id, "in_review");
    await addRegistration(event.id, "paid");
    await addRegistration(event.id, "cancelled");

    expect(await countConfirmedRegistrations(event.id, db)).toBe(3);
  });

  it("HU-05: update con cupos menores a los confirmados rechaza y no cambia la fila", async () => {
    const event = await createEvent(10);
    for (let i = 0; i < 5; i += 1) await addRegistration(event.id, "paid");
    const updateEvent = makeUpdateEvent({
      clubs,
      events: new PrismaEventRepository(db),
      registrations: {
        countConfirmed: (eventId, tx) =>
          countConfirmedRegistrations(eventId, tx ? toPrismaTx(tx) : undefined),
        listIds: (eventId, tx) => listEventRegistrationIds(eventId, toPrismaTx(tx)),
      },
      transactions: prismaTransactions(db),
      now: () => new Date("2030-12-01T12:00:00.000Z"),
    });
    const input = {
      clubSlug,
      eventId: event.id,
      communityId,
      title: "Cambiado",
      startsAt: new Date("2030-12-06T00:00:00.000Z"),
      venueName: "Coliseo",
      mapsUrl: null,
      priceCents: 1250,
      isMixed: false,
      rules: null,
      publish: false,
    };

    await expect(updateEvent({ ...input, capacity: 4 })).rejects.toThrow(
      CapacityBelowConfirmedError,
    );
    const unchanged = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(unchanged).toMatchObject({ capacity: 10, title: "Mixto", status: "published" });

    // Capacity equal to confirmed is accepted and the event becomes full.
    expect(await updateEvent({ ...input, capacity: 5 })).toEqual({ status: "full" });
    const full = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(full).toMatchObject({ capacity: 5, title: "Cambiado", status: "full" });
  });
});
