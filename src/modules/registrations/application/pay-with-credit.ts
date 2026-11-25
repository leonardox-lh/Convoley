import { EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
import { assertAwaitingPayment } from "../domain/registration";
import type { Credits, EventSeats, RegistrationRepository, TransactionRunner } from "./ports";
import { releaseExpiredReservations } from "./seats";

/**
 * HU-27: the player pays the sign-up with a credit of their plan, found by their phone or
 * Google account. One transaction: the registration is "paid" only if a credit was spent. No
 * payment row is recorded: no new money moves, the plan was already paid.
 */
export function makePayWithCredit(deps: {
  events: EventSeats;
  registrations: RegistrationRepository;
  credits: Credits;
  transactions: TransactionRunner;
  now: () => Date;
}) {
  return async function payWithCredit(registrationId: string) {
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

      await deps.credits.consume(
        {
          player: { clubId: event.clubId, phone: registration.phone, userId: registration.userId },
          event: { communityId: event.communityId, startsAt: event.startsAt },
          registrationId: registration.id,
        },
        tx,
      );
      await deps.registrations.setStatus(registration.id, "paid", tx);
    });
  };
}
