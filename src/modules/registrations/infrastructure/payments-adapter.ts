import {
  approveVoucher,
  attachProviderPaymentId,
  chargeOutcome,
  findClubIdByMercadoPagoAccount,
  findMercadoPagoPayment,
  getMercadoPagoAccess,
  getMercadoPagoStatus,
  isMercadoPagoConfigured,
  mercadoPagoChargesClient,
  recordMercadoPagoPayment,
  setMercadoPagoPaymentStatus,
  type MercadoPagoCharge,
  findVoucherInReview,
  recordManualPayment,
  recordVoucherPayment,
  rejectVoucher,
  saveVoucherImage,
} from "@/modules/payments";
import type {
  ChargeReport,
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
  findInReview: (registrationId, tx) => findVoucherInReview(registrationId, toPrismaTx(tx)),
  approve: (input, tx) => approveVoucher(input, toPrismaTx(tx)),
  reject: (input, tx) => rejectVoucher(input, toPrismaTx(tx)),
};

/** Mercado Pago charges with the club's connected account (HU-19, HU-20). */
export const mercadoPagoGatewayAdapter: MercadoPagoGateway = {
  async isEnabled(clubId) {
    return isMercadoPagoConfigured() && (await getMercadoPagoStatus(clubId)) !== null;
  },
  async charge(clubId, charge) {
    const { accessToken } = await getMercadoPagoAccess(clubId);
    return toReport(await mercadoPagoChargesClient.create(accessToken, charge));
  },
  async find(clubId, providerPaymentId) {
    const { accessToken } = await getMercadoPagoAccess(clubId);
    return toReport(await mercadoPagoChargesClient.find(accessToken, providerPaymentId));
  },
  async refund(clubId, providerPaymentId, idempotencyKey) {
    const { accessToken } = await getMercadoPagoAccess(clubId);
    await mercadoPagoChargesClient.refund(accessToken, providerPaymentId, idempotencyKey);
  },
  clubIdForAccount: findClubIdByMercadoPagoAccount,
};

function toReport(charge: MercadoPagoCharge): ChargeReport {
  const { status, ...rest } = charge;
  return { ...rest, result: chargeOutcome(status) };
}

export const mercadoPagoRecordsAdapter: MercadoPagoPaymentRecords = {
  recordPending: (payment, tx) => recordMercadoPagoPayment(payment, toPrismaTx(tx)),
  attachProviderId: attachProviderPaymentId,
  find: (where, tx) => findMercadoPagoPayment(where, tx && toPrismaTx(tx)),
  setStatus: (input, tx) => setMercadoPagoPaymentStatus(input, tx && toPrismaTx(tx)),
};
