import { db } from "@/lib/db";

/** HU-34: approved money of these registrations and orders, keyed by owner id. */
export async function sumApprovedPaymentsByOwner(input: {
  registrationIds: string[];
  orderIds: string[];
}) {
  const payments = await db.payment.findMany({
    where: {
      status: "approved",
      OR: [{ registrationId: { in: input.registrationIds } }, { orderId: { in: input.orderIds } }],
    },
    select: { registrationId: true, orderId: true, amountCents: true },
  });
  const totals = new Map<string, number>();
  for (const payment of payments) {
    const owner = payment.registrationId ?? payment.orderId;
    if (owner) totals.set(owner, (totals.get(owner) ?? 0) + payment.amountCents);
  }
  return totals;
}

/** HU-34: approved plan payments of the club made in [from, to). */
export async function sumApprovedPlanPayments(input: { clubId: string; from: Date; to: Date }) {
  const { _sum } = await db.payment.aggregate({
    where: {
      clubId: input.clubId,
      status: "approved",
      planPurchaseId: { not: null },
      createdAt: { gte: input.from, lt: input.to },
    },
    _sum: { amountCents: true },
  });
  return _sum.amountCents ?? 0;
}
