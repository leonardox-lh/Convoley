import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
} from "../application/ports";
import { DuplicateRegistrationError } from "../domain/errors";
import {
  countConfirmedRegistrations,
  promoteWaitlisted,
  waitlistPosition,
} from "./prisma-registration-reader";

const UNIQUE_VIOLATION = "P2002";

export function prismaTransactions(db: PrismaClient): TransactionRunner {
  return { run: (work) => db.$transaction((tx) => work(tx as unknown as TransactionContext)) };
}

/** The Prisma client behind a TransactionContext created by prismaTransactions. */
export function toPrismaTx(tx: TransactionContext): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}

export const prismaRegistrationRepository: RegistrationRepository = {
  countConfirmed: (eventId, tx) => countConfirmedRegistrations(eventId, toPrismaTx(tx)),

  findByPhone: (eventId, phone, tx) =>
    toPrismaTx(tx).registration.findUnique({
      where: { eventId_phone: { eventId, phone } },
      select: { id: true, status: true },
    }),

  // An active sign-up first; a cancelled one only when there is no other.
  findByUser: async (eventId, userId, tx) =>
    (await toPrismaTx(tx).registration.findFirst({
      where: { eventId, userId, status: { not: "cancelled" } },
      select: { id: true, status: true },
    })) ??
    toPrismaTx(tx).registration.findFirst({
      where: { eventId, userId },
      select: { id: true, status: true },
    }),

  async create(eventId, player, status, tx) {
    try {
      return await toPrismaTx(tx).registration.create({
        data: { eventId, ...player, status },
        select: { id: true },
      });
    } catch (error) {
      // Backstop for the @@unique([eventId, phone]) if two sign-ups ever slip past the lock.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new DuplicateRegistrationError(eventId);
      }
      throw error;
    }
  },

  async reactivate(id, player, status, tx) {
    // A new createdAt puts the comeback at the end of the list and of the waitlist.
    await toPrismaTx(tx).registration.update({
      where: { id },
      data: { ...player, status, reservedUntil: null, createdAt: new Date() },
    });
  },

  promoteWaitlisted: (eventId, seats, tx) => promoteWaitlisted(eventId, seats, toPrismaTx(tx)),

  waitlistPosition: (id, tx) => waitlistPosition(id, toPrismaTx(tx)),

  findInEvent: (id, eventId, tx) =>
    toPrismaTx(tx).registration.findFirst({
      where: { id, eventId },
      select: { id: true, status: true },
    }),

  findById: (id, tx) =>
    toPrismaTx(tx).registration.findUnique({
      where: { id },
      select: { id: true, eventId: true, status: true, phone: true, userId: true },
    }),

  async setStatus(id, status, tx) {
    await toPrismaTx(tx).registration.update({
      where: { id },
      data: { status, reservedUntil: null },
    });
  },

  async reserve(id, until, tx) {
    await toPrismaTx(tx).registration.update({ where: { id }, data: { reservedUntil: until } });
  },

  async releaseExpired(eventId, now, tx) {
    const { count } = await toPrismaTx(tx).registration.updateMany({
      where: { eventId, status: "pending_payment", reservedUntil: { lte: now } },
      data: { status: "cancelled", reservedUntil: null },
    });
    return count;
  },
};
