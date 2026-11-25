import {
  AccountRequiredError,
  EventNotOpenError,
  RegistrationNotFoundError,
} from "../domain/errors";
import { assertAwaitingPayment, type EventSeatInfo } from "../domain/registration";
import type {
  Credits,
  EventSeats,
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
} from "./ports";
import { releaseExpiredReservations } from "./seats";

type Deps = {
  events: EventSeats;
  registrations: RegistrationRepository;
  credits: Credits;
  transactions: TransactionRunner;
  now: () => Date;
};

type Registration = { id: string; userId: string };

/**
 * Pays a sign-up with something the player already has in the club (no new money moves, so no
 * payment row). One transaction: the registration is "paid" only if `spend` succeeded.
 */
function makePayFromPlayerFunds(
  deps: Deps,
  spend: (input: {
    registration: Registration;
    event: EventSeatInfo;
    tx: TransactionContext;
  }) => Promise<void>,
) {
  return async (input: { registrationId: string; signedInUserId: string | null }) => {
    await deps.transactions.run(async (tx) => {
      const registration = await deps.registrations.findById(input.registrationId, tx);
      if (!registration) throw new RegistrationNotFoundError(input.registrationId);
      // The private link alone isn't enough: a guest sign-up later linked to an account by phone
      // could otherwise spend that account's plan or balance.
      const userId = registration.userId;
      if (!userId || userId !== input.signedInUserId) throw new AccountRequiredError();
      const locked = await deps.events.lock(registration.eventId, tx);
      if (!locked || locked.status === "cancelled" || locked.startsAt <= deps.now()) {
        throw new EventNotOpenError(registration.eventId);
      }
      // An ended reservation can't be paid: the seat may belong to someone else now (HU-21).
      const event = await releaseExpiredReservations(deps, locked, deps.now(), tx);
      const current = await deps.registrations.findInEvent(registration.id, event.id, tx);
      if (!current) throw new RegistrationNotFoundError(registration.id);
      assertAwaitingPayment(current);

      await spend({ registration: { id: registration.id, userId }, event, tx });
      await deps.registrations.setStatus(registration.id, "paid", tx);
    });
  };
}

/** HU-27: one credit of the plan bought with the player's Google account. */
export function makePayWithCredit(deps: Deps) {
  return makePayFromPlayerFunds(deps, ({ registration, event, tx }) =>
    deps.credits.consume(
      {
        player: { clubId: event.clubId, userId: registration.userId },
        event: { communityId: event.communityId, startsAt: event.startsAt },
        registrationId: registration.id,
      },
      tx,
    ),
  );
}

/** HU-30: the player's balance in favor covers the whole price. */
export function makePayWithBalance(deps: Deps) {
  return makePayFromPlayerFunds(deps, ({ registration, event, tx }) =>
    deps.credits.spendBalance(
      {
        clubId: event.clubId,
        userId: registration.userId,
        amountCents: event.priceCents,
        registrationId: registration.id,
      },
      tx,
    ),
  );
}
