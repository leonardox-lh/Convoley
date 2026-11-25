import {
  approveVoucher,
  attachProviderPaymentId,
  findMercadoPagoPayment,
  mercadoPagoGateway,
  recordMercadoPagoPayment,
  setMercadoPagoPaymentStatus,
  findVoucherInReview,
  recordManualPayment,
  recordVoucherPayment,
  rejectVoucher,
  saveVoucherImage,
} from "@/modules/payments";
import type {
  ManualPayments,
  MercadoPagoGateway,
  MercadoPagoPaymentRecords,
  VoucherPayments,
  VoucherReviews,
} from "../application/ports";
import { toPrismaTx } from "./prisma-registration-repository";

export const paymentsAdapter: ManualPayments = {
  record: (payment, tx) => recordManualPayment(payment, toPrismaTx(tx)),
};

export const voucherPaymentsAdapter: VoucherPayments = {
  storeImage: saveVoucherImage,
  record: (payment, tx) => recordVoucherPayment(payment, toPrismaTx(tx)),
};

export const voucherReviewsAdapter: VoucherReviews = {
  findInReview: (registrationId, tx) => findVoucherInReview({ registrationId }, toPrismaTx(tx)),
  approve: (input, tx) => approveVoucher(input, toPrismaTx(tx)),
  reject: (input, tx) => rejectVoucher(input, toPrismaTx(tx)),
};

/** Mercado Pago charges with the club's connected account (HU-19, HU-20). */
export const mercadoPagoGatewayAdapter: MercadoPagoGateway = mercadoPagoGateway;

export const mercadoPagoRecordsAdapter: MercadoPagoPaymentRecords = {
  recordPending: (payment, tx) => recordMercadoPagoPayment(payment, toPrismaTx(tx)),
  attachProviderId: attachProviderPaymentId,
  find: (where, tx) => findMercadoPagoPayment(where, tx && toPrismaTx(tx)),
  setStatus: (input, tx) => setMercadoPagoPaymentStatus(input, tx && toPrismaTx(tx)),
};
