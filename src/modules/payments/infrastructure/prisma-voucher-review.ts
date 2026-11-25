import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { PaymentOwner, PaymentOwnerKey } from "../domain/payment";

type Client = Prisma.TransactionClient;

/** The voucher of a registration or order that waits for the organizer, if any. */
export function findVoucherInReview(owner: PaymentOwner, tx: Client) {
  return tx.payment.findFirst({
    where: { ...owner, method: "voucher", status: "in_review" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}

export async function approveVoucher(
  input: { paymentId: string; reviewedByUserId: string; at: Date },
  tx: Client,
) {
  await tx.payment.update({
    where: { id: input.paymentId },
    data: { status: "approved", reviewedByUserId: input.reviewedByUserId, reviewedAt: input.at },
  });
}

export async function rejectVoucher(
  input: { paymentId: string; reason: string; reviewedByUserId: string; at: Date },
  tx: Client,
) {
  await tx.payment.update({
    where: { id: input.paymentId },
    data: {
      status: "rejected",
      rejectionReason: input.reason,
      reviewedByUserId: input.reviewedByUserId,
      reviewedAt: input.at,
    },
  });
}

/** Vouchers waiting for review, keyed by their registration or order (HU-15, HU-25). */
export async function listVouchersInReview(
  ownerIds: string[],
  key: PaymentOwnerKey = "registrationId",
): Promise<Map<string, { proofFileKey: string | null; yapeSecurityCode: string | null }>> {
  if (ownerIds.length === 0) return new Map();
  const rows = await db.payment.findMany({
    where: { [key]: { in: ownerIds }, method: "voucher", status: "in_review" },
    select: { [key]: true, proofFileKey: true, yapeSecurityCode: true },
  });
  return new Map(
    rows.map((row) => [
      (row as unknown as Record<PaymentOwnerKey, string>)[key],
      { proofFileKey: row.proofFileKey, yapeSecurityCode: row.yapeSecurityCode },
    ]),
  );
}

/** Why the player's last voucher was rejected, so they can fix it and upload again. */
export async function findLastVoucherRejection(owner: PaymentOwner): Promise<string | null> {
  const last = await db.payment.findFirst({
    where: { ...owner, method: "voucher" },
    orderBy: { createdAt: "desc" },
    select: { status: true, rejectionReason: true },
  });
  return last?.status === "rejected" ? last.rejectionReason : null;
}
