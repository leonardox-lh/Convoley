import { returnCredits } from "@/modules/plans";
import type { CreditsReturner } from "../application/ports";
import { toPrismaTx } from "./prisma-transactions";

export const creditsAdapter: CreditsReturner = {
  giveBack: (registrationIds, tx) => returnCredits(registrationIds, toPrismaTx(tx)),
};
