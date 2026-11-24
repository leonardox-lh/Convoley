import type { Prisma } from "@/generated/prisma/client";
import { parseSecurityCode } from "../domain/voucher";

export interface VoucherPaymentInput {
  clubId: string;
  registrationId: string;
  amountCents: number;
  proofFileKey: string;
  yapeSecurityCode: string | null;
}

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
