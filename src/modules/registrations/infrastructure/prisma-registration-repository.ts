import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  PlayerDetails,
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
} from "../application/ports";
import { DuplicateRegistrationError } from "../domain/errors";
import { countConfirmedRegistrations } from "./prisma-registration-reader";

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

  async create(eventId: string, player: PlayerDetails, tx: TransactionContext) {
    try {
      return await toPrismaTx(tx).registration.create({
        data: { eventId, ...player },
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

  async reactivate(id: string, player: PlayerDetails, tx: TransactionContext) {
    await toPrismaTx(tx).registration.update({
      where: { id },
      data: { ...player, status: "pending_payment" },
    });
  },
};
