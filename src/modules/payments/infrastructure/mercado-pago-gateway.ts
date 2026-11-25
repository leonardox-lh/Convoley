import type { MercadoPagoCharge, NewMercadoPagoCharge } from "../application/ports";
import { chargeOutcome, type ChargeOutcome } from "../domain/mercado-pago-status";
import { isMercadoPagoConfigured } from "./mercado-pago-api";
import { mercadoPagoCharges } from "./mercado-pago-charges";
import { findClubIdByMercadoPagoAccount } from "./prisma-mercado-pago-payment";

/** A charge as the other modules read it: Mercado Pago's status reduced to an outcome. */
export type ChargeReport = Omit<MercadoPagoCharge, "status"> & { result: ChargeOutcome };

function toReport(charge: MercadoPagoCharge): ChargeReport {
  const { status, ...rest } = charge;
  return { ...rest, result: chargeOutcome(status) };
}

/**
 * Charges on the club's connected Mercado Pago account (HU-19, HU-24, HU-27), shared by every
 * module that takes payments. The money goes straight to the organizer.
 */
export function mercadoPagoGateway(deps: {
  accessToken: (clubId: string) => Promise<{ accessToken: string }>;
  isConnected: (clubId: string) => Promise<boolean>;
}) {
  const charges = mercadoPagoCharges();
  const token = async (clubId: string) => (await deps.accessToken(clubId)).accessToken;
  return {
    async isEnabled(clubId: string) {
      return isMercadoPagoConfigured() && (await deps.isConnected(clubId));
    },
    async charge(clubId: string, charge: NewMercadoPagoCharge) {
      return toReport(await charges.create(await token(clubId), charge));
    },
    async find(clubId: string, providerPaymentId: string) {
      return toReport(await charges.find(await token(clubId), providerPaymentId));
    },
    async refund(clubId: string, providerPaymentId: string, idempotencyKey: string) {
      await charges.refund(await token(clubId), providerPaymentId, idempotencyKey);
    },
    clubIdForAccount: findClubIdByMercadoPagoAccount,
  };
}
