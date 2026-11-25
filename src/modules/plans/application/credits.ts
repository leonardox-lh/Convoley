import { NoCreditAvailableError } from "../domain/errors";
import { availableCredits, pickPurchaseForCredit } from "../domain/purchase";
import type { PlayerKey, PurchaseRepository, TransactionContext } from "./ports";

export interface CreditEvent {
  communityId: string;
  startsAt: Date;
}

/** HU-27: credits the player can use for this event; null = unlimited, 0 = none. */
export function makeGetCreditBalance(deps: { purchases: PurchaseRepository }) {
  return async (input: { player: PlayerKey; event: CreditEvent }) =>
    availableCredits(await deps.purchases.listForPlayer(input.player), input.event);
}

/**
 * HU-27: pays a registration with one credit, inside the caller's transaction so the
 * registration is "paid" only if the credit was spent. The player's purchases stay locked, so
 * two sign-ups at once can't spend the same last credit.
 */
export function makeConsumeCredit(deps: { purchases: PurchaseRepository }) {
  return async (
    input: { player: PlayerKey; event: CreditEvent; registrationId: string },
    tx: TransactionContext,
  ) => {
    const purchases = await deps.purchases.listForPlayer(input.player, tx);
    const purchase = pickPurchaseForCredit(purchases, input.event);
    if (!purchase) throw new NoCreditAvailableError();
    await deps.purchases.useCredit(purchase.id, input.registrationId, tx);
  };
}

/** HU-27: a removed registration or a cancelled event gives its credit back. */
export function makeReturnCredits(deps: { purchases: PurchaseRepository }) {
  return (registrationIds: string[], tx: TransactionContext) =>
    deps.purchases.returnCredits(registrationIds, tx);
}
