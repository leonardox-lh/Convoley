import { StaleSubscriptionError } from "../domain/errors";
import {
  addDays,
  isWritable,
  MONTHLY_PRICE_CENTS,
  nextPaidUntil,
  subscriptionState,
  TRIAL_DAYS,
} from "../domain/subscription";
import type { SubscriptionRepository } from "./ports";

interface Deps {
  subscriptions: SubscriptionRepository;
  now: () => Date;
}

/** HU-35: starts the free trial of a new club. Safe to call twice. */
export const makeStartTrial =
  ({ subscriptions, now }: Deps) =>
  async (clubId: string) => {
    await subscriptions.ensure(clubId, addDays(now(), TRIAL_DAYS));
  };

/** The club's subscription and its state; a club without one gets its trial now. */
export const makeGetClubSubscription =
  ({ subscriptions, now }: Deps) =>
  async (clubId: string) => {
    const at = now();
    const subscription = await subscriptions.ensure(clubId, addDays(at, TRIAL_DAYS));
    return { subscription, access: subscriptionState(subscription, at) };
  };

export const makeIsClubWritable = (deps: Deps) => {
  const getSubscription = makeGetClubSubscription(deps);
  return async (clubId: string) => isWritable((await getSubscription(clubId)).access);
};

/** HU-36: every club's subscription with its state, for the platform owner. */
export const makeListSubscriptions =
  ({ subscriptions, now }: Deps) =>
  async () => {
    const at = now();
    return (await subscriptions.listAll()).map((subscription) => ({
      subscription,
      access: subscriptionState(subscription, at),
    }));
  };

/** HU-35/36: the owner records one monthly payment received outside Convoley. */
export const makeRecordSubscriptionPayment =
  ({ subscriptions, now }: Deps) =>
  async (input: { clubId: string; expectedPaidUntil: Date | null; recordedByUserId: string }) => {
    const at = now();
    const subscription = await subscriptions.ensure(input.clubId, addDays(at, TRIAL_DAYS));
    if (subscription.paidUntil?.getTime() !== input.expectedPaidUntil?.getTime()) {
      throw new StaleSubscriptionError(input.clubId);
    }
    const recorded = await subscriptions.recordPayment({
      ...input,
      newPaidUntil: nextPaidUntil(subscription, at),
      amountCents: MONTHLY_PRICE_CENTS,
    });
    if (!recorded) throw new StaleSubscriptionError(input.clubId);
  };

/** HU-36: suspending forces read-only; reactivating only lifts the suspension. */
export const makeSetClubSuspended =
  ({ subscriptions, now }: Deps) =>
  async (input: { clubId: string; suspended: boolean }) => {
    const at = now();
    await subscriptions.ensure(input.clubId, addDays(at, TRIAL_DAYS));
    await subscriptions.setSuspendedAt(input.clubId, input.suspended ? at : null);
  };
