import { db } from "@/lib/db";
import {
  makeGetClubSubscription,
  makeIsClubWritable,
  makeListSubscriptions,
  makeRecordSubscriptionPayment,
  makeSetClubSuspended,
  makeStartTrial,
} from "./application/subscriptions";
import { prismaSubscriptionRepository } from "./infrastructure/prisma-subscription-repository";

const deps = { subscriptions: prismaSubscriptionRepository(db), now: () => new Date() };

export const startTrial = makeStartTrial(deps);
export const getClubSubscription = makeGetClubSubscription(deps);
export const isClubWritable = makeIsClubWritable(deps);
export const listSubscriptions = makeListSubscriptions(deps);
export const recordSubscriptionPayment = makeRecordSubscriptionPayment(deps);
export const setClubSuspended = makeSetClubSuspended(deps);

export {
  EXPIRY_WARNING_DAYS,
  MONTHLY_PRICE_CENTS,
  TRIAL_DAYS,
  type ClubAccess,
  type SubscriptionStatus,
} from "./domain/subscription";
export { StaleSubscriptionError } from "./domain/errors";
