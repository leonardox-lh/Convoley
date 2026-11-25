import { EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
import { holdsSeat } from "../domain/registration";
import type { Credits, EventSeats, RegistrationRepository, TransactionRunner } from "./ports";
import { fillFreedSeats } from "./seats";

export interface RemoveRegistrationInput {
  eventId: string;
  registrationId: string;
}

/**
 * Cancels a registration. A freed seat goes to the first player in the waitlist (HU-12);
 * with nobody waiting, a full event reopens.
 * A payment it already had stays as history: the organizer returns the money outside Convoley.
 * A plan credit it used goes back to the player's plan (HU-27).
 */
export function makeRemoveRegistration(deps: {
  events: EventSeats;
  registrations: RegistrationRepository;
  credits: Credits;
  transactions: TransactionRunner;
}) {
  return async function removeRegistration(input: RemoveRegistrationInput) {
    await deps.transactions.run(async (tx) => {
      const event = await deps.events.lock(input.eventId, tx);
      // A cancelled event's list is frozen: its payments were already marked for refund/balance.
      if (!event || event.status === "cancelled") throw new EventNotOpenError(input.eventId);

      const registration = await deps.registrations.findInEvent(input.registrationId, event.id, tx);
      if (!registration) throw new RegistrationNotFoundError(input.registrationId);
      if (registration.status === "cancelled") return;

      const freesSeat = holdsSeat(registration.status);
      await deps.registrations.setStatus(registration.id, "cancelled", tx);
      await deps.credits.giveBack([registration.id], tx);
      if (freesSeat) await fillFreedSeats(deps, event, 1, tx);
    });
  };
}
