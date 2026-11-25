import { NoBalanceAvailableError } from "../domain/errors";
import type { BalanceKey, BalanceRepository, TransactionContext } from "./ports";

type Deps = { balances: BalanceRepository };

/**
 * HU-30: balance in favor is what a player kept by cancelling before the club's deadline. It
 * only pays whole sign-ups of the same club; it is never money Convoley holds or pays out.
 */
export function makeEarnBalance(deps: Deps) {
  return async (input: BalanceKey & { amountCents: number }, tx: TransactionContext) => {
    // A free event leaves nothing to keep.
    if (input.amountCents <= 0) return;
    await deps.balances.add(input, input.amountCents, tx);
  };
}

/** HU-30: pays a whole sign-up with balance, inside the caller's transaction. */
export function makeSpendBalance(deps: Deps) {
  return async (
    input: BalanceKey & { amountCents: number; registrationId: string },
    tx: TransactionContext,
  ) => {
    // A free event has nothing to pay; BalanceUse requires a positive amount.
    if (input.amountCents <= 0) throw new NoBalanceAvailableError();
    const spent = await deps.balances.spend(input, input, tx);
    if (!spent) throw new NoBalanceAvailableError();
  };
}
