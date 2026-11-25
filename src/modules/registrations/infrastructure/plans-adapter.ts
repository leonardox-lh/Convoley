import {
  consumeCredit,
  earnBalance,
  NoBalanceAvailableError,
  NoCreditAvailableError,
  paidWithoutMoney,
  returnCredits,
  spendBalance,
} from "@/modules/plans";
import type { Credits } from "../application/ports";
import { NoBalanceError, NoCreditError } from "../domain/errors";
import { toPrismaTx } from "./prisma-registration-repository";

/** HU-27: plan credits, spent and given back inside our own transaction. */
export const creditsAdapter: Credits = {
  async consume(input, tx) {
    try {
      await consumeCredit(input, toPrismaTx(tx));
    } catch (error) {
      if (error instanceof NoCreditAvailableError) throw new NoCreditError();
      throw error;
    }
  },
  giveBack: (registrationIds, tx) => returnCredits(registrationIds, toPrismaTx(tx)),
  paidWithoutMoney: async (registrationId, tx) =>
    (await paidWithoutMoney(registrationId, toPrismaTx(tx))) !== null,
  earnBalance: (input, tx) => earnBalance(input, toPrismaTx(tx)),
  async spendBalance(input, tx) {
    try {
      await spendBalance(input, toPrismaTx(tx));
    } catch (error) {
      if (error instanceof NoBalanceAvailableError) throw new NoBalanceError();
      throw error;
    }
  },
};
