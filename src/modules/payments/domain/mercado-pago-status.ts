/** Where a Mercado Pago charge stands, in our terms. */
export type ChargeOutcome = "approved" | "rejected" | "pending";

/**
 * Mercado Pago payment statuses → ours. in_process (antifraud review) and authorized stay
 * pending until the webhook brings the final answer.
 */
export function chargeOutcome(mpStatus: string): ChargeOutcome {
  if (mpStatus === "approved") return "approved";
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(mpStatus)) return "rejected";
  return "pending";
}

/** Mercado Pago sends amounts in soles with decimals; we keep integer cents. */
export const solesToCentsExact = (soles: number) => Math.round(soles * 100);
export const centsToSolesAmount = (cents: number) => cents / 100;
