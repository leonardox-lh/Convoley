import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type Client = Prisma.TransactionClient;

/** One row per attempt, created before charging so its id can be the idempotency key. */
export async function recordMercadoPagoPayment(
  input: { clubId: string; registrationId: string; amountCents: number; serviceFeeCents: number },
  tx: Client,
): Promise<{ id: string }> {
  return tx.payment.create({
    data: { ...input, method: "mercado_pago", status: "pending" },
    select: { id: true },
  });
}

export async function attachProviderPaymentId(paymentId: string, providerPaymentId: string) {
  await db.payment.update({ where: { id: paymentId }, data: { providerPaymentId } });
}

const SETTLEMENT_FIELDS = {
  id: true,
  clubId: true,
  registrationId: true,
  amountCents: true,
  status: true,
  providerPaymentId: true,
} as const;

/** A Mercado Pago payment of ours, by our id (external_reference) or Mercado Pago's id. */
export function findMercadoPagoPayment(
  where: { id: string } | { providerPaymentId: string },
  tx: Client = db,
) {
  return tx.payment.findFirst({
    where: { ...where, method: "mercado_pago" },
    select: SETTLEMENT_FIELDS,
  });
}

export async function setMercadoPagoPaymentStatus(
  input: {
    paymentId: string;
    status: "pending" | "approved" | "rejected" | "refund_pending" | "refunded";
    statusDetail: string | null;
    providerPaymentId?: string;
  },
  tx: Client = db,
) {
  await tx.payment.update({
    where: { id: input.paymentId },
    data: {
      status: input.status,
      providerStatusDetail: input.statusDetail,
      ...(input.providerPaymentId && { providerPaymentId: input.providerPaymentId }),
    },
  });
}

/** The club whose connected Mercado Pago account is this one (webhooks carry user_id). */
export async function findClubIdByMercadoPagoAccount(mpUserId: string) {
  const row = await db.mercadoPagoConnection.findUnique({
    where: { mpUserId },
    select: { clubId: true },
  });
  return row?.clubId ?? null;
}
