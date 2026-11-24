import { EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
import type { EventSeats, RegistrationRepository, TransactionRunner } from "./ports";

export interface RemoveRegistrationInput {
  eventId: string;
  registrationId: string;
}

/**
 * Cancels a registration, which frees its spot, and reopens the event if it was full.
 * A payment it already had stays as history: the organizer returns the money outside Convoley.
 */
export function makeRemoveRegistration(deps: {
  events: EventSeats;
  registrations: RegistrationRepository;
  transactions: TransactionRunner;
}) {
  return async function removeRegistration(input: RemoveRegistrationInput) {
    await deps.transactions.run(async (tx) => {
      const event = await deps.events.lock(input.eventId, tx);
      if (!event) throw new EventNotOpenError(input.eventId);

      const registration = await deps.registrations.findInEvent(input.registrationId, event.id, tx);
      if (!registration) throw new RegistrationNotFoundError(input.registrationId);
      if (registration.status === "cancelled") return;

      await deps.registrations.setStatus(registration.id, "cancelled", tx);
      if (event.status === "full") await deps.events.reopen(event.id, tx);
    });
  };
}
