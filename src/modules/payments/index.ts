import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  makeConnectMercadoPago,
  makeDisconnectMercadoPago,
  makeGetMercadoPagoAccess,
} from "./application/mercado-pago-connection";
import { mercadoPagoOAuth } from "./infrastructure/mercado-pago-api";
import { mercadoPagoGateway as makeMercadoPagoGateway } from "./infrastructure/mercado-pago-gateway";
import {
  findMercadoPagoStatus,
  prismaMercadoPagoConnections,
} from "./infrastructure/prisma-mercado-pago-connection-repository";

export {
  CANCELLATION_OUTCOMES,
  PAYMENT_STATUSES_WITH_MONEY,
  type CancellationOutcome,
  type PaymentOwner,
} from "./domain/payment";
export { markPaymentsForCancellation } from "./infrastructure/prisma-payment-marker";
export { revertApprovedPayments } from "./infrastructure/prisma-payment-reversal";
export {
  sumApprovedPaymentsByOwner,
  sumApprovedPlanPayments,
} from "./infrastructure/prisma-payment-totals";
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
/** Charges, lookups and refunds on the club's own Mercado Pago account. */
export const mercadoPagoGateway = makeMercadoPagoGateway({
  accessToken: getMercadoPagoAccess,
  isConnected: async (clubId) => (await getMercadoPagoStatus(clubId)) !== null,
});
export type { ChargeReport } from "./infrastructure/mercado-pago-gateway";
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
export type { MercadoPagoCharge, NewMercadoPagoCharge } from "./application/ports";
export { MercadoPagoChargeError } from "./domain/errors";
export {
  attachProviderPaymentId,
  findClubIdByMercadoPagoAccount,
  findMercadoPagoPayment,
  findMercadoPagoPaymentOwner,
  recordMercadoPagoPayment,
  setMercadoPagoPaymentStatus,
} from "./infrastructure/prisma-mercado-pago-payment";
export { verifyWebhookSignature } from "./infrastructure/webhook-signature";
