import { recordManualPayment, recordVoucherPayment, saveVoucherImage } from "@/modules/payments";
import type { ManualPayments, VoucherPayments } from "../application/ports";
import { toPrismaTx } from "./prisma-registration-repository";

export const paymentsAdapter: ManualPayments = {
  record: (payment, tx) => recordManualPayment(payment, toPrismaTx(tx)),
};

export const voucherPaymentsAdapter: VoucherPayments = {
  storeImage: saveVoucherImage,
  record: (payment, tx) => recordVoucherPayment(payment, toPrismaTx(tx)),
};
