import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type Client = Prisma.TransactionClient;

/** The voucher of a registration that waits for the organizer, if any. */
export function findVoucherInReview(registrationId: string, tx: Client) {
  return tx.payment.findFirst({
    where: { registrationId, method: "voucher", status: "in_review" },
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

/** Vouchers waiting for review, keyed by registration, for the organizer's list (HU-15). */
export async function listVouchersInReview(
  registrationIds: string[],
): Promise<Map<string, { proofFileKey: string | null; yapeSecurityCode: string | null }>> {
  if (registrationIds.length === 0) return new Map();
  const rows = await db.payment.findMany({
    where: {
      registrationId: { in: registrationIds },
      method: "voucher",
      status: "in_review",
    },
    select: { registrationId: true, proofFileKey: true, yapeSecurityCode: true },
  });
  return new Map(
    rows.map((row) => [
      row.registrationId!,
      { proofFileKey: row.proofFileKey, yapeSecurityCode: row.yapeSecurityCode },
    ]),
  );
}

/** Why the player's last voucher was rejected, so they can fix it and upload again. */
export async function findLastVoucherRejection(registrationId: string): Promise<string | null> {
  const last = await db.payment.findFirst({
    where: { registrationId, method: "voucher" },
    orderBy: { createdAt: "desc" },
    select: { status: true, rejectionReason: true },
  });
  return last?.status === "rejected" ? last.rejectionReason : null;
}
