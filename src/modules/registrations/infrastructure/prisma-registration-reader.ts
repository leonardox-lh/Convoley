import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { SEAT_HOLDING_STATUSES } from "../domain/registration";
import type { PlayerRegistrations, RegistrationListReader } from "../application/ports";

type Client = Prisma.TransactionClient;

/** Holding a seat; an expired reservation (HU-21) doesn't, even before a write releases it. */
const holdingSeat = (): Prisma.RegistrationWhereInput => ({
  status: { in: [...SEAT_HOLDING_STATUSES] },
  OR: [{ reservedUntil: null }, { reservedUntil: { gt: new Date() } }],
});

/** Confirmed registrations (the ones holding a spot) of an event. */
export async function countConfirmedRegistrations(eventId: string, tx: Client = db) {
  return tx.registration.count({ where: { eventId, ...holdingSeat() } });
}

/** Confirmed registrations of many events in a single query, keyed by event id. */
export async function countConfirmedRegistrationsByEvent(eventIds: string[]) {
  const groups = await db.registration.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds }, ...holdingSeat() },
    _count: { _all: true },
  });
  return new Map(groups.map((group) => [group.eventId, group._count._all]));
}

export async function listEventRegistrationIds(eventId: string, tx: Client = db) {
  const rows = await tx.registration.findMany({ where: { eventId }, select: { id: true } });
  return rows.map((row) => row.id);
}

export const prismaRegistrationListReader: RegistrationListReader = {
  listByEvent: (eventId) =>
    db.registration.findMany({
      where: { eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        position: true,
        level: true,
        status: true,
        createdAt: true,
      },
    }),
};

export const prismaPlayerRegistrations: PlayerRegistrations = {
  async listByUser(userId) {
    const rows = await db.registration.findMany({
      where: { userId },
      select: { id: true, eventId: true, status: true, createdAt: true },
    });
    return Promise.all(
      rows.map(async (row) => ({ ...row, waitlistPosition: await waitlistPosition(row.id) })),
    );
  },
  async linkGuestsToUser(phone, userId) {
    const { count } = await db.registration.updateMany({
      where: { phone, userId: null },
      data: { userId },
    });
    return count;
  },
};

/** First `seats` waitlisted registrations of the event, by arrival, move to pending payment. */
export async function promoteWaitlisted(eventId: string, seats: number, tx: Client = db) {
  if (seats <= 0) return 0;
  const next = await tx.registration.findMany({
    where: { eventId, status: "waitlisted" },
    orderBy: { createdAt: "asc" },
    take: seats,
    select: { id: true },
  });
  if (next.length === 0) return 0;
  const { count } = await tx.registration.updateMany({
    where: { id: { in: next.map((row) => row.id) }, status: "waitlisted" },
    data: { status: "pending_payment" },
  });
  return count;
}

/** 1-based place in the waitlist by arrival; null when the registration isn't waiting. */
export async function waitlistPosition(registrationId: string, tx: Client = db) {
  const registration = await tx.registration.findUnique({
    where: { id: registrationId },
    select: { eventId: true, status: true, createdAt: true },
  });
  if (registration?.status !== "waitlisted") return null;
  const ahead = await tx.registration.count({
    where: {
      eventId: registration.eventId,
      status: "waitlisted",
      createdAt: { lt: registration.createdAt },
    },
  });
  return ahead + 1;
}

/** One registration as its owner sees it from their private link (HU-14). */
export async function findRegistrationOverview(registrationId: string) {
  const registration = await db.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      eventId: true,
      firstName: true,
      lastName: true,
      status: true,
      reservedUntil: true,
      phone: true,
      userId: true,
    },
  });
  if (!registration) return null;
  return { ...registration, waitlistPosition: await waitlistPosition(registration.id) };
}
