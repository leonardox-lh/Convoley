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
import type { MercadoPagoGateway, OrderPayments } from "../application/ports";
import { toPrismaTx } from "./prisma-order-repository";

export const gatewayAdapter: MercadoPagoGateway = mercadoPagoGateway;

export const orderPaymentsAdapter: OrderPayments = {
  recordMercadoPago: (payment, tx) => recordMercadoPagoPayment(payment, toPrismaTx(tx)),
  attachProviderId: attachProviderPaymentId,
  find: (where, tx) => findMercadoPagoPayment(where, tx && toPrismaTx(tx)),
  setStatus: (input, tx) => setMercadoPagoPaymentStatus(input, tx && toPrismaTx(tx)),
  storeVoucherImage: saveVoucherImage,
  recordVoucher: (payment, tx) => recordVoucherPayment(payment, toPrismaTx(tx)),
  findVoucherInReview: (orderId, tx) => findVoucherInReview({ orderId }, toPrismaTx(tx)),
  approveVoucher: (input, tx) => approveVoucher(input, toPrismaTx(tx)),
  rejectVoucher: (input, tx) => rejectVoucher(input, toPrismaTx(tx)),
};
