import type { Prisma } from "@/generated/prisma/client";

/**
 * Seat access for the `registrations` module, inside its transaction. Locks the same row
 * as update/cancel, so a sign-up never races a capacity change or a cancellation.
 */
export async function lockEventForRegistration(eventId: string, tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
  return tx.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      clubId: true,
      status: true,
      capacity: true,
      priceCents: true,
      startsAt: true,
    },
  });
}

export async function markEventFull(eventId: string, tx: Prisma.TransactionClient) {
  await tx.event.update({ where: { id: eventId }, data: { status: "full" } });
}

/** Back to published after a spot frees up; only touches events that are still full. */
export async function reopenEvent(eventId: string, tx: Prisma.TransactionClient) {
  await tx.event.updateMany({
    where: { id: eventId, status: "full" },
    data: { status: "published" },
  });
}
