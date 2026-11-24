import { markPaymentsForCancellation } from "@/modules/payments";
import type { PaymentsMarker } from "../application/ports";
import { toPrismaTx } from "./prisma-transactions";

export const paymentsAdapter: PaymentsMarker = {
  markForCancellation: async (input, tx) => {
    await markPaymentsForCancellation(input, toPrismaTx(tx));
  },
};
