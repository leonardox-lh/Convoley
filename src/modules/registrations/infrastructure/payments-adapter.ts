import { recordManualPayment } from "@/modules/payments";
import type { ManualPayments } from "../application/ports";
import { toPrismaTx } from "./prisma-registration-repository";

export const paymentsAdapter: ManualPayments = {
  record: (payment, tx) => recordManualPayment(payment, toPrismaTx(tx)),
};
