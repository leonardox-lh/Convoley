import type { PrismaClient } from "@/generated/prisma/client";
import type { BalanceRepository } from "../application/ports";
import { toPrismaTx } from "./prisma-purchase-repository";

export function prismaBalanceRepository(db: PrismaClient): BalanceRepository {
  return {
    async find({ clubId, userId }) {
      const row = await db.playerBalance.findUnique({
        where: { clubId_userId: { clubId, userId } },
        select: { balanceCents: true },
      });
      return row?.balanceCents ?? 0;
    },

    async add({ clubId, userId }, amountCents, tx) {
      await toPrismaTx(tx).playerBalance.upsert({
        where: { clubId_userId: { clubId, userId } },
        create: { clubId, userId, balanceCents: amountCents },
        update: { balanceCents: { increment: amountCents } },
      });
    },

    async spend({ clubId, userId }, { amountCents, registrationId }, tx) {
      const client = toPrismaTx(tx);
      // The condition and the decrement are one statement: two sign-ups at once can't both
      // spend the same balance, and the CHECK keeps it from going negative anyway.
      const { count } = await client.playerBalance.updateMany({
        where: { clubId, userId, balanceCents: { gte: amountCents } },
        data: { balanceCents: { decrement: amountCents } },
      });
      if (count === 0) return false;
      const balance = await client.playerBalance.findUniqueOrThrow({
        where: { clubId_userId: { clubId, userId } },
        select: { id: true },
      });
      await client.balanceUse.create({
        data: { playerBalanceId: balance.id, registrationId, amountCents },
      });
      return true;
    },

    async returnUses(registrationIds, tx) {
      if (registrationIds.length === 0) return;
      const client = toPrismaTx(tx);
      const uses = await client.balanceUse.findMany({
        where: { registrationId: { in: registrationIds } },
        select: { id: true, playerBalanceId: true, amountCents: true },
      });
      for (const use of uses) {
        // Two give-backs of the same use at once: only the one that deleted it returns the money.
        const { count } = await client.balanceUse.deleteMany({ where: { id: use.id } });
        if (count === 0) continue;
        await client.playerBalance.update({
          where: { id: use.playerBalanceId },
          data: { balanceCents: { increment: use.amountCents } },
        });
      }
    },

    async paidWithoutMoney(registrationId, tx) {
      const client = toPrismaTx(tx);
      const [credit, balance] = await Promise.all([
        client.creditUse.findUnique({ where: { registrationId }, select: { id: true } }),
        client.balanceUse.findUnique({ where: { registrationId }, select: { id: true } }),
      ]);
      if (credit) return "plan_credit";
      return balance ? "balance" : null;
    },
  };
}
