import {
  approveVoucher,
  attachProviderPaymentId,
  findMercadoPagoPayment,
  findVoucherInReview,
  mercadoPagoGateway,
  recordMercadoPagoPayment,
  recordVoucherPayment,
  rejectVoucher,
  saveVoucherImage,
  setMercadoPagoPaymentStatus,
} from "@/modules/payments";
import type { MercadoPagoGateway, PurchasePayments } from "../application/ports";
import { toPrismaTx } from "./prisma-purchase-repository";

export const gatewayAdapter: MercadoPagoGateway = mercadoPagoGateway;

export const purchasePaymentsAdapter: PurchasePayments = {
  recordMercadoPago: (payment, tx) => recordMercadoPagoPayment(payment, toPrismaTx(tx)),
  attachProviderId: attachProviderPaymentId,
  find: (where, tx) => findMercadoPagoPayment(where, tx && toPrismaTx(tx)),
  setStatus: (input, tx) => setMercadoPagoPaymentStatus(input, tx && toPrismaTx(tx)),
  storeVoucherImage: saveVoucherImage,
  recordVoucher: (payment, tx) => recordVoucherPayment(payment, toPrismaTx(tx)),
  findVoucherInReview: (purchaseId, tx) =>
    findVoucherInReview({ planPurchaseId: purchaseId }, toPrismaTx(tx)),
  approveVoucher: (input, tx) => approveVoucher(input, toPrismaTx(tx)),
  rejectVoucher: (input, tx) => rejectVoucher(input, toPrismaTx(tx)),
};
