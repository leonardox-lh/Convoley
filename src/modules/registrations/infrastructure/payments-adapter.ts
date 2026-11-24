import {
  approveVoucher,
  findVoucherInReview,
  recordManualPayment,
  recordVoucherPayment,
  rejectVoucher,
  saveVoucherImage,
} from "@/modules/payments";
import type { ManualPayments, VoucherPayments, VoucherReviews } from "../application/ports";
import { toPrismaTx } from "./prisma-registration-repository";

export const paymentsAdapter: ManualPayments = {
  record: (payment, tx) => recordManualPayment(payment, toPrismaTx(tx)),
};

export const voucherPaymentsAdapter: VoucherPayments = {
  storeImage: saveVoucherImage,
  record: (payment, tx) => recordVoucherPayment(payment, toPrismaTx(tx)),
};

export const voucherReviewsAdapter: VoucherReviews = {
  findInReview: (registrationId, tx) => findVoucherInReview(registrationId, toPrismaTx(tx)),
  approve: (input, tx) => approveVoucher(input, toPrismaTx(tx)),
  reject: (input, tx) => rejectVoucher(input, toPrismaTx(tx)),
};
