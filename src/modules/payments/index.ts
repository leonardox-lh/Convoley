import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  makeConnectMercadoPago,
  makeDisconnectMercadoPago,
  makeGetMercadoPagoAccess,
} from "./application/mercado-pago-connection";
import { mercadoPagoOAuth } from "./infrastructure/mercado-pago-api";
import {
  findMercadoPagoStatus,
  prismaMercadoPagoConnections,
} from "./infrastructure/prisma-mercado-pago-connection-repository";

export {
  CANCELLATION_OUTCOMES,
  PAYMENT_STATUSES_WITH_MONEY,
  type CancellationOutcome,
} from "./domain/payment";
export { markPaymentsForCancellation } from "./infrastructure/prisma-payment-marker";
export {
  recordManualPayment,
  type ManualPaymentInput,
} from "./infrastructure/prisma-manual-payment";
export {
  recordVoucherPayment,
  type VoucherPaymentInput,
} from "./infrastructure/prisma-voucher-payment";
export { readVoucherImage, saveVoucherImage } from "./infrastructure/s3-voucher-storage";
export { MAX_VOUCHER_BYTES } from "./domain/voucher";
export {
  InvalidSecurityCodeError,
  InvalidVoucherTypeError,
  VoucherTooLargeError,
} from "./domain/errors";
export {
  approveVoucher,
  findLastVoucherRejection,
  findVoucherInReview,
  listVouchersInReview,
  rejectVoucher,
} from "./infrastructure/prisma-voucher-review";
export { signVoucherPath, verifyVoucherSignature } from "./infrastructure/voucher-url";

// ─── Mercado Pago (Sprint 3) ───
const mercadoPagoConnections = prismaMercadoPagoConnections(db, env.MP_TOKEN_ENCRYPTION_KEY ?? "");
const mercadoPagoOAuthClient = mercadoPagoOAuth();

export const connectMercadoPago = makeConnectMercadoPago({
  oauth: mercadoPagoOAuthClient,
  connections: mercadoPagoConnections,
});
export const disconnectMercadoPago = makeDisconnectMercadoPago({
  connections: mercadoPagoConnections,
});
export const getMercadoPagoAccess = makeGetMercadoPagoAccess({
  oauth: mercadoPagoOAuthClient,
  connections: mercadoPagoConnections,
  now: () => new Date(),
});
export const getMercadoPagoStatus = (clubId: string) => findMercadoPagoStatus(db, clubId);
export {
  isMercadoPagoConfigured,
  mercadoPagoAuthorizationUrl,
} from "./infrastructure/mercado-pago-api";
export { signOAuthState, verifyOAuthState } from "./infrastructure/oauth-state";
export {
  MercadoPagoAccountInUseError,
  MercadoPagoAuthorizationError,
  MercadoPagoNotConnectedError,
} from "./domain/errors";
