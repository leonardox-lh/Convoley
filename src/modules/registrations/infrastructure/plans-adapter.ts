import { consumeCredit, NoCreditAvailableError, returnCredits } from "@/modules/plans";
import type { Credits } from "../application/ports";
import { NoCreditError } from "../domain/errors";
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
};
