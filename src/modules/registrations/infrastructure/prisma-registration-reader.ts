import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { SEAT_HOLDING_STATUSES } from "../domain/registration";
import type { RegistrationListReader } from "../application/ports";

type Client = Prisma.TransactionClient;

/** Confirmed registrations (the ones holding a spot) of an event. */
export async function countConfirmedRegistrations(eventId: string, tx: Client = db) {
  return tx.registration.count({
    where: { eventId, status: { in: [...SEAT_HOLDING_STATUSES] } },
  });
}

/** Confirmed registrations of many events in a single query, keyed by event id. */
export async function countConfirmedRegistrationsByEvent(eventIds: string[]) {
  const groups = await db.registration.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds }, status: { in: [...SEAT_HOLDING_STATUSES] } },
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
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
};
