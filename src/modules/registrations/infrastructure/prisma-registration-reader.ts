import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { SEAT_HOLDING_STATUSES } from "../domain/registration";

type Client = Prisma.TransactionClient;

/** Confirmed registrations (the ones holding a spot) of an event. */
export async function countConfirmedRegistrations(eventId: string, tx: Client = db) {
  return tx.registration.count({
    where: { eventId, status: { in: [...SEAT_HOLDING_STATUSES] } },
  });
}

export async function listEventRegistrationIds(eventId: string, tx: Client = db) {
  const rows = await tx.registration.findMany({ where: { eventId }, select: { id: true } });
  return rows.map((row) => row.id);
}
