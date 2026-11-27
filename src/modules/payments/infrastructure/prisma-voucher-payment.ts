import type { Prisma } from "@/generated/prisma/client";
import type { PaymentOwner } from "../domain/payment";
import { parseSecurityCode } from "../domain/voucher";

export type VoucherPaymentInput = {
  clubId: string;
  amountCents: number;
  proofFileKey: string;
  yapeSecurityCode: string | null;
  payerNote?: string | null;
} & PaymentOwner;

/** A screenshot the player uploaded (HU-14): waits for the organizer's review. */
export async function recordVoucherPayment(
  input: VoucherPaymentInput,
  tx: Prisma.TransactionClient,
) {
  const yapeSecurityCode = parseSecurityCode(input.yapeSecurityCode);
  await tx.payment.create({
    data: { ...input, yapeSecurityCode, method: "voucher", status: "in_review" },
  });
}
