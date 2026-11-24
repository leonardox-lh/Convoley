import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { TransactionContext, TransactionRunner } from "../application/ports";

export function prismaTransactions(db: PrismaClient): TransactionRunner {
  return { run: (work) => db.$transaction((tx) => work(tx as unknown as TransactionContext)) };
}

/** The Prisma client behind a TransactionContext created by prismaTransactions. */
export function toPrismaTx(tx: TransactionContext): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}
