import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { PAYMENT_STATUSES_WITH_MONEY, type CancellationOutcome } from "../domain/payment";

/**
 * Marks the payments of cancelled registrations for refund or balance. Idempotent: payments
 * already marked keep their first outcome.
 */
export async function markPaymentsForCancellation(
  input: { registrationIds: string[]; outcome: CancellationOutcome },
  tx: Prisma.TransactionClient = db,
): Promise<number> {
  if (input.registrationIds.length === 0) return 0;
  const { count } = await tx.payment.updateMany({
    where: {
      registrationId: { in: input.registrationIds },
      status: { in: [...PAYMENT_STATUSES_WITH_MONEY] },
      cancellationOutcome: null,
    },
    data: { cancellationOutcome: input.outcome },
  });
  return count;
}
