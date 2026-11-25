import type { Prisma } from "@/generated/prisma/client";

const REVERSAL_REASON = "Revertido a pendiente por el organizador.";

/**
 * The organizer took back a "paid": its approved payments stop counting. Rejected (not deleted)
 * so the history stays and a late Mercado Pago webhook finds a final status and does nothing.
 * Returns whether one was charged by Mercado Pago: that money must be refunded there.
 */
export async function revertApprovedPayments(
  input: { registrationId: string; reviewedByUserId: string },
  tx: Prisma.TransactionClient,
): Promise<{ chargedByMercadoPago: boolean }> {
  const approved = await tx.payment.findMany({
    where: { registrationId: input.registrationId, status: "approved" },
    select: { id: true, method: true },
  });
  if (approved.length === 0) return { chargedByMercadoPago: false };
  await tx.payment.updateMany({
    where: { id: { in: approved.map((payment) => payment.id) } },
    data: {
      status: "rejected",
      rejectionReason: REVERSAL_REASON,
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt: new Date(),
    },
  });
  return { chargedByMercadoPago: approved.some((payment) => payment.method === "mercado_pago") };
}
