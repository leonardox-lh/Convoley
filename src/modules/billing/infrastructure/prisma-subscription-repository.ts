import type { PrismaClient } from "@/generated/prisma/client";
import type { SubscriptionRepository } from "../application/ports";

const FIELDS = { clubId: true, trialEndsAt: true, paidUntil: true, suspendedAt: true } as const;

export function prismaSubscriptionRepository(db: PrismaClient): SubscriptionRepository {
  return {
    ensure: (clubId, trialEndsAt) =>
      db.subscription.upsert({
        where: { clubId },
        create: { clubId, trialEndsAt },
        update: {},
        select: FIELDS,
      }),
    listAll: () => db.subscription.findMany({ select: FIELDS }),
    recordPayment: (input) =>
      db.$transaction(async (tx) => {
        // Conditional update: a second click with the same expected date matches no row.
        const { count } = await tx.subscription.updateMany({
          where: { clubId: input.clubId, paidUntil: input.expectedPaidUntil },
          data: { paidUntil: input.newPaidUntil },
        });
        if (count === 0) return false;
        await tx.subscriptionPayment.create({
          data: {
            clubId: input.clubId,
            amountCents: input.amountCents,
            paidUntil: input.newPaidUntil,
            recordedByUserId: input.recordedByUserId,
          },
        });
        return true;
      }),
    async setSuspendedAt(clubId, suspendedAt) {
      await db.subscription.update({ where: { clubId }, data: { suspendedAt } });
    },
  };
}
