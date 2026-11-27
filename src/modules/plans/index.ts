import { db } from "@/lib/db";
import { makeEarnBalance, makeSpendBalance } from "./application/balance";
import { makeConsumeCredit, makeGetCreditBalance, makeReturnCredits } from "./application/credits";
import { prismaBalanceRepository } from "./infrastructure/prisma-balance-repository";
import { makeCreatePlan, makeSetPlanActive } from "./application/plans";
import {
  makeApprovePlanVoucher,
  makeBuyPlan,
  makeRejectPlanVoucher,
  makeSettlePlanPurchaseNotification,
  makeSettlePlanPurchasePayment,
  makeStartPlanMercadoPagoPayment,
  makeSubmitPlanVoucher,
} from "./application/purchases";
import { clubCommunitiesAdapter, serviceFeesAdapter } from "./infrastructure/clubs-adapter";
import { gatewayAdapter, purchasePaymentsAdapter } from "./infrastructure/payments-adapter";
import { listClubPlans, prismaPlanRepository } from "./infrastructure/prisma-plan-repository";
import {
  findPlayerPurchaseStatuses,
  findPurchases,
  fromPrismaTx,
  prismaPurchaseRepository,
  prismaTransactions,
} from "./infrastructure/prisma-purchase-repository";

const plans = prismaPlanRepository(db);
const purchases = prismaPurchaseRepository(db);
const transactions = prismaTransactions(db);
const now = () => new Date();

// ─── Plans (HU-26) ───
export const createPlan = makeCreatePlan({ plans, communities: clubCommunitiesAdapter });
export const setPlanActive = makeSetPlanActive({ plans });
export const listPlans = (clubId: string, options: { onlyActive: boolean }) =>
  listClubPlans(db, clubId, options);
export type { StoredPlan as Plan } from "./application/ports";
export { MAX_PLAN_CREDITS, MAX_PLAN_VALIDITY_DAYS, PLAN_NAME_MAX_LENGTH } from "./domain/plan";

// ─── Purchases (HU-27) ───
const paymentDeps = {
  purchases,
  gateway: gatewayAdapter,
  payments: purchasePaymentsAdapter,
  transactions,
  now,
};
const settlePlanPurchasePayment = makeSettlePlanPurchasePayment(paymentDeps);
export const buyPlan = makeBuyPlan({ plans, purchases, now: () => new Date() });
export const startPlanMercadoPagoPayment = makeStartPlanMercadoPagoPayment(
  { ...paymentDeps, serviceFees: serviceFeesAdapter },
  settlePlanPurchasePayment,
);
export const settlePlanPurchaseNotification = makeSettlePlanPurchaseNotification(
  paymentDeps,
  settlePlanPurchasePayment,
);
export const submitPlanVoucher = makeSubmitPlanVoucher(paymentDeps);
export const approvePlanVoucher = makeApprovePlanVoucher(paymentDeps);
export const rejectPlanVoucher = makeRejectPlanVoucher(paymentDeps);
export const findPlanPurchase = async (purchaseId: string) =>
  (await findPurchases(db, { id: purchaseId }))[0] ?? null;
export const listPlanPurchases = (clubId: string) => findPurchases(db, { clubId });
export const listPlayerPlanPurchases = (input: { clubId: string; userId: string }) =>
  findPlayerPurchaseStatuses(db, input);

// ─── Credits (HU-27): they run inside the registrations module's transaction ───
type PrismaTransaction = Parameters<typeof fromPrismaTx>[0];
export const getCreditBalance = makeGetCreditBalance({ purchases });
const consume = makeConsumeCredit({ purchases });
const giveBack = makeReturnCredits({ purchases });
export const consumeCredit = (input: Parameters<typeof consume>[0], tx: PrismaTransaction) =>
  consume(input, fromPrismaTx(tx));
/** Gives back plan credits and balance (HU-30) that these registrations used. */
export const returnCredits = async (registrationIds: string[], tx: PrismaTransaction) => {
  await giveBack(registrationIds, fromPrismaTx(tx));
  await balances.returnUses(registrationIds, fromPrismaTx(tx));
};

// ─── Balance in favor (HU-30): also inside the registrations module's transaction ───
const balances = prismaBalanceRepository(db);
const earn = makeEarnBalance({ balances });
const spend = makeSpendBalance({ balances });
export const getBalance = (input: { clubId: string; userId: string }) => balances.find(input);
export const earnBalance = (input: Parameters<typeof earn>[0], tx: PrismaTransaction) =>
  earn(input, fromPrismaTx(tx));
export const spendBalance = (input: Parameters<typeof spend>[0], tx: PrismaTransaction) =>
  spend(input, fromPrismaTx(tx));
export const paidWithoutMoney = (registrationId: string, tx: PrismaTransaction) =>
  balances.paidWithoutMoney(registrationId, fromPrismaTx(tx));

export {
  InvalidPlanError,
  MercadoPagoUnavailableError,
  NoBalanceAvailableError,
  NoCreditAvailableError,
  NothingToReviewError,
  PlanAlreadyOpenError,
  PlanNotFoundError,
  PlanPurchaseNotFoundError,
  PlanPurchaseStatusError,
  type InvalidPlanReason,
} from "./domain/errors";
export type { PlanPurchaseStatus } from "./domain/purchase";
