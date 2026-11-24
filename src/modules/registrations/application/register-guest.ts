import { DuplicateRegistrationError, EventNotOpenError } from "../domain/errors";
import { PhoneNumber } from "../domain/phone-number";
import { assertSpotAvailable } from "../domain/registration";
import type { EventSeats, RegistrationRepository, TransactionRunner } from "./ports";

export interface RegisterGuestInput {
  eventId: string;
  firstName: string;
  lastName: string;
  phone: string;
  userId: string | null;
}

export function makeRegisterGuest(deps: {
  events: EventSeats;
  registrations: RegistrationRepository;
  transactions: TransactionRunner;
  now: () => Date;
}) {
  return async function registerGuest(input: RegisterGuestInput) {
    const phone = PhoneNumber.parse(input.phone).value;
    const player = {
      firstName: input.firstName,
      lastName: input.lastName,
      phone,
      userId: input.userId,
    };

    return deps.transactions.run(async (tx) => {
      // The lock serializes sign-ups to this event: the count below can't go stale.
      const event = await deps.events.lock(input.eventId, tx);
      if (!event) throw new EventNotOpenError(input.eventId);

      const existing = await deps.registrations.findByPhone(event.id, phone, tx);
      if (existing && existing.status !== "cancelled")
        throw new DuplicateRegistrationError(event.id);

      const confirmed = await deps.registrations.countConfirmed(event.id, tx);
      assertSpotAvailable(event, confirmed, deps.now());

      let id: string;
      if (existing) {
        await deps.registrations.reactivate(existing.id, player, tx);
        id = existing.id;
      } else {
        ({ id } = await deps.registrations.create(event.id, player, tx));
      }
      if (confirmed + 1 >= event.capacity) await deps.events.markFull(event.id, tx);

      return { id, status: "pending_payment" as const };
    });
  };
}
