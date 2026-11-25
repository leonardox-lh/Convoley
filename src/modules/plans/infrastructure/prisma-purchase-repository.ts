import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type {
  PurchaseRepository,
  TransactionContext,
  TransactionRunner,
} from "../application/ports";

export function prismaTransactions(db: PrismaClient): TransactionRunner {
  return { run: (work) => db.$transaction((tx) => work(tx as unknown as TransactionContext)) };
}

/** Another module's Prisma transaction, so credits are spent inside it (HU-27). */
export function fromPrismaTx(tx: Prisma.TransactionClient): TransactionContext {
  return tx as unknown as TransactionContext;
}

/** The Prisma client behind a TransactionContext created by prismaTransactions. */

export function toPrismaTx(tx: TransactionContext): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}

export function prismaPurchaseRepository(db: PrismaClient): PurchaseRepository {
  return {
    create: ({ buyer, ...purchase }) =>
      db.planPurchase.create({ data: { ...purchase, ...buyer }, select: { id: true } }),

    async lock(purchaseId, tx) {
      const client = toPrismaTx(tx);
      await client.$queryRaw`SELECT id FROM "PlanPurchase" WHERE id = ${purchaseId} FOR UPDATE`;
      const row = await client.planPurchase.findUnique({
        where: { id: purchaseId },
        select: {
          id: true,
          clubId: true,
          status: true,
          plan: { select: { priceCents: true, creditCount: true, validityDays: true } },
        },
      });
      return row && { id: row.id, clubId: row.clubId, status: row.status, ...row.plan };
    },

    async setStatus(purchaseId, status, tx) {
      await toPrismaTx(tx).planPurchase.update({ where: { id: purchaseId }, data: { status } });
    },

    async activate(purchaseId, terms, tx) {
      await toPrismaTx(tx).planPurchase.update({
        where: { id: purchaseId },
        data: { status: "active", ...terms },
      });
    },

    async listForPlayer({ clubId, userId }, tx) {
      const client = tx ? toPrismaTx(tx) : db;
      if (tx) {
        // Serializes two sign-ups of the same player, so the last credit is spent only once.
        await client.$queryRaw`
          SELECT id FROM "PlanPurchase"
          WHERE "clubId" = ${clubId} AND status = 'active'
            AND "userId" = ${userId}
          ORDER BY id FOR UPDATE`;
      }
      const rows = await client.planPurchase.findMany({
        where: { clubId, status: "active", userId },
        select: {
          id: true,
          status: true,
          creditsRemaining: true,
          expiresAt: true,
          plan: { select: { communityIds: true } },
        },
      });
      return rows.map(({ plan, ...row }) => ({ ...row, communityIds: plan.communityIds }));
    },

    async useCredit(purchaseId, registrationId, tx) {
      const client = toPrismaTx(tx);
      await client.creditUse.create({ data: { planPurchaseId: purchaseId, registrationId } });
      // Unlimited plans (null) have nothing to count.
      await client.planPurchase.updateMany({
        where: { id: purchaseId, creditsRemaining: { not: null } },
        data: { creditsRemaining: { decrement: 1 } },
      });
    },

    async returnCredits(registrationIds, tx) {
      if (registrationIds.length === 0) return;
      const client = toPrismaTx(tx);
      const uses = await client.creditUse.findMany({
        where: { registrationId: { in: registrationIds } },
        select: { id: true, planPurchaseId: true },
      });
      for (const use of uses) {
        // Two give-backs of the same use at once: only the one that deleted it returns the credit.
        const { count } = await client.creditUse.deleteMany({ where: { id: use.id } });
        if (count === 0) continue;
        await client.planPurchase.updateMany({
          where: { id: use.planPurchaseId, creditsRemaining: { not: null } },
          data: { creditsRemaining: { increment: 1 } },
        });
      }
    },
  };
}

/** Purchases with their plan, for the player's page and the organizer's list. */
export function findPurchases(db: PrismaClient, where: { id?: string; clubId?: string }) {
  return db.planPurchase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    // shortcut: the organizer sees the latest 100 purchases; add paging when a club has more.
    take: 100,
    select: {
      id: true,
      clubId: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      creditsRemaining: true,
      expiresAt: true,
      createdAt: true,
      plan: {
        select: {
          name: true,
          priceCents: true,
          creditCount: true,
          validityDays: true,
          communityIds: true,
        },
      },
    },
  });
}
