import type { PrismaClient } from "@/generated/prisma/client";
import type { PaymentSettingsRepository } from "../application/ports";
import { NO_SERVICE_FEE, type ServiceFee } from "../domain/service-fee";

export function prismaPaymentSettingsRepository(db: PrismaClient): PaymentSettingsRepository {
  return {
    find: (clubSlug) =>
      db.club.findUnique({
        where: { slug: clubSlug },
        select: {
          paymentApp: true,
          paymentPhone: true,
          paymentHolderName: true,
          paymentQrKey: true,
          serviceFeeFixedCents: true,
          serviceFeePercentBps: true,
          cancellationDeadlineHours: true,
        },
      }),
    async update(clubSlug, changes) {
      await db.club.update({ where: { slug: clubSlug }, data: changes });
    },
  };
}

/** HU-22: the club's service fee, by id (how other modules know the club). */
export async function findServiceFee(db: PrismaClient, clubId: string): Promise<ServiceFee> {
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { serviceFeeFixedCents: true, serviceFeePercentBps: true },
  });
  if (!club) return NO_SERVICE_FEE;
  return { fixedCents: club.serviceFeeFixedCents, percentBps: club.serviceFeePercentBps };
}

/** HU-30: the club's cancellation deadline in hours, or null when it has no policy. */
export async function findCancellationDeadlineHours(
  db: PrismaClient,
  clubId: string,
): Promise<number | null> {
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { cancellationDeadlineHours: true },
  });
  return club?.cancellationDeadlineHours ?? null;
}
