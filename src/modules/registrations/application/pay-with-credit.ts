import { EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
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

type Registration = { id: string; phone: string; userId: string | null };

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
  return async (registrationId: string) => {
    await deps.transactions.run(async (tx) => {
      const registration = await deps.registrations.findById(registrationId, tx);
      if (!registration) throw new RegistrationNotFoundError(registrationId);
      const locked = await deps.events.lock(registration.eventId, tx);
      if (!locked || locked.status === "cancelled" || locked.startsAt <= deps.now()) {
        throw new EventNotOpenError(registration.eventId);
      }
      // An ended reservation can't be paid: the seat may belong to someone else now (HU-21).
      const event = await releaseExpiredReservations(deps, locked, deps.now(), tx);
      const current = await deps.registrations.findInEvent(registration.id, event.id, tx);
      if (!current) throw new RegistrationNotFoundError(registration.id);
      assertAwaitingPayment(current);

      await spend({ registration, event, tx });
      await deps.registrations.setStatus(registration.id, "paid", tx);
    });
  };
}

/** HU-27: one credit of the player's plan, found by their phone or Google account. */
export function makePayWithCredit(deps: Deps) {
  return makePayFromPlayerFunds(deps, ({ registration, event, tx }) =>
    deps.credits.consume(
      {
        player: { clubId: event.clubId, phone: registration.phone, userId: registration.userId },
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
        phone: registration.phone,
        amountCents: event.priceCents,
        registrationId: registration.id,
      },
      tx,
    ),
  );
}
