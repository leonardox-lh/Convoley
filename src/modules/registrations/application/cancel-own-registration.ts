import { type CancellationResult, cancellationResult } from "../domain/cancellation";
import { EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
import { holdsSeat } from "../domain/registration";
import type {
  CancellationPolicies,
  Credits,
  EventSeats,
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
} from "./ports";
import { fillFreedSeats } from "./seats";

type Deps = {
  events: EventSeats;
  registrations: RegistrationRepository;
  credits: Credits;
  policies: CancellationPolicies;
  transactions: TransactionRunner;
  now: () => Date;
};

/** Locks the event and works out what cancelling now means; throws if it isn't allowed. */
async function evaluate(deps: Deps, registrationId: string, tx: TransactionContext) {
  const registration = await deps.registrations.findById(registrationId, tx);
  if (!registration) throw new RegistrationNotFoundError(registrationId);
  const event = await deps.events.lock(registration.eventId, tx);
  if (!event || event.status === "cancelled") throw new EventNotOpenError(registration.eventId);
  // Re-read under the lock: a payment may have landed meanwhile.
  const current = await deps.registrations.findInEvent(registration.id, event.id, tx);
  if (!current) throw new RegistrationNotFoundError(registration.id);
  const result = cancellationResult({
    status: current.status,
    paidWithoutMoney: await deps.credits.paidWithoutMoney(registration.id, tx),
    hasAccount: registration.userId !== null,
    startsAt: event.startsAt,
    now: deps.now(),
    deadlineHours: await deps.policies.deadlineHours(event.clubId),
  });
  return { registration, current, event, result };
}

/** HU-29: what the player will keep, shown before they confirm. */
export function makeGetCancellationPreview(deps: Deps) {
  return (registrationId: string): Promise<CancellationResult> =>
    deps.transactions.run(async (tx) => (await evaluate(deps, registrationId, tx)).result);
}

/**
 * HU-29: the player cancels from their private link, under the club's policy (HU-30). The seat
 * goes to the waitlist; what they paid becomes balance, goes back to their plan, or is lost.
 */
export function makeCancelOwnRegistration(deps: Deps) {
  return (registrationId: string): Promise<CancellationResult> =>
    deps.transactions.run(async (tx) => {
      const { registration, current, event, result } = await evaluate(deps, registrationId, tx);
      if (result === "balance" && registration.userId) {
        await deps.credits.earnBalance(
          { clubId: event.clubId, userId: registration.userId, amountCents: event.priceCents },
          tx,
        );
      }
      if (result === "returned") await deps.credits.giveBack([registration.id], tx);
      await deps.registrations.setStatus(registration.id, "cancelled", tx);
      if (holdsSeat(current.status)) await fillFreedSeats(deps, event, 1, tx);
      return result;
    });
}
