import type { Prisma } from "@/generated/prisma/client";

export interface ManualPaymentInput {
  clubId: string;
  registrationId: string;
  amountCents: number;
  reviewedByUserId: string;
}

/** A payment the organizer received outside Convoley (cash, transfer): approved on creation. */
export async function recordManualPayment(input: ManualPaymentInput, tx: Prisma.TransactionClient) {
  await tx.payment.create({
    data: { ...input, method: "manual", status: "approved", reviewedAt: new Date() },
  });
}
