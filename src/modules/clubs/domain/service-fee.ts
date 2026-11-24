import { InvalidServiceFeeError } from "./errors";

/** HU-22 limits, so a typo can't charge players a fortune. */
export const MAX_FIXED_SERVICE_FEE_CENTS = 5_000; // S/ 50
export const MAX_SERVICE_FEE_PERCENT_BPS = 2_000; // 20 %
const BASIS_POINTS_PER_WHOLE = 10_000;

/** A fixed amount or a percentage of the price (in basis points: 350 = 3.5 %), never both. */
export interface ServiceFee {
  fixedCents: number;
  percentBps: number;
}

export type ServiceFeeKind = "none" | "fixed" | "percent";

export const NO_SERVICE_FEE: ServiceFee = { fixedCents: 0, percentBps: 0 };

/** `amount` is cents for "fixed" and basis points for "percent". */
export function parseServiceFee(kind: ServiceFeeKind, amount: number): ServiceFee {
  if (kind === "none") return NO_SERVICE_FEE;
  const limit = kind === "fixed" ? MAX_FIXED_SERVICE_FEE_CENTS : MAX_SERVICE_FEE_PERCENT_BPS;
  if (!Number.isInteger(amount) || amount <= 0 || amount > limit) {
    throw new InvalidServiceFeeError();
  }
  return kind === "fixed"
    ? { fixedCents: amount, percentBps: 0 }
    : { fixedCents: 0, percentBps: amount };
}

/** What the player pays on top of the price; a percentage rounds up to the next cent. */
export function serviceFeeCents(priceCents: number, fee: ServiceFee): number {
  return fee.fixedCents + Math.ceil((priceCents * fee.percentBps) / BASIS_POINTS_PER_WHOLE);
}
