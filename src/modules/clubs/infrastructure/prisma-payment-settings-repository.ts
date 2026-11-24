import type { PrismaClient } from "@/generated/prisma/client";
import type { PaymentSettingsRepository } from "../application/ports";

export function prismaPaymentSettingsRepository(db: PrismaClient): PaymentSettingsRepository {
  return {
    find: (clubSlug) =>
      db.club.findUnique({
        where: { slug: clubSlug },
        select: { paymentPhone: true, paymentHolderName: true, paymentQrKey: true },
      }),
    async update(clubSlug, changes) {
      await db.club.update({ where: { slug: clubSlug }, data: changes });
    },
  };
}
