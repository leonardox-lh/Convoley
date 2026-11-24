import { ClubNotFoundError } from "../domain/errors";
import { parseServiceFee, type ServiceFeeKind } from "../domain/service-fee";
import type { PaymentSettingsRepository } from "./ports";

export interface UpdateServiceFeeInput {
  clubSlug: string;
  kind: ServiceFeeKind;
  /** Cents for "fixed", basis points for "percent", ignored for "none". */
  amount: number;
}

/** HU-22: the organizer passes the gateway's commission on to players paying by Mercado Pago. */
export function makeUpdateServiceFee(deps: { settings: PaymentSettingsRepository }) {
  return async function updateServiceFee(input: UpdateServiceFeeInput) {
    const fee = parseServiceFee(input.kind, input.amount);
    if (!(await deps.settings.find(input.clubSlug))) throw new ClubNotFoundError(input.clubSlug);
    await deps.settings.update(input.clubSlug, {
      serviceFeeFixedCents: fee.fixedCents,
      serviceFeePercentBps: fee.percentBps,
    });
  };
}
