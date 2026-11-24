import { EventFullError, EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
import type { EventSeatInfo } from "../domain/registration";
import type {
  EventSeats,
  ManualPayments,
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
} from "./ports";

export interface MarkPaidManuallyInput {
  eventId: string;
  registrationId: string;
  reviewedByUserId: string;
}

interface RecordPaidDeps {
  registrations: RegistrationRepository;
  payments: ManualPayments;
}

/** Records the event price as a manual payment and marks the registration paid. */
export async function recordPaid(
  deps: RecordPaidDeps,
  input: { event: EventSeatInfo; registrationId: string; reviewedByUserId: string },
  tx: TransactionContext,
) {
  // Amount and club come from the locked event, never from the form.
  await deps.payments.record(
    {
      clubId: input.event.clubId,
      registrationId: input.registrationId,
      amountCents: input.event.priceCents,
      reviewedByUserId: input.reviewedByUserId,
    },
    tx,
  );
  await deps.registrations.setStatus(input.registrationId, "paid", tx);
}

export function makeMarkPaidManually(
  deps: RecordPaidDeps & { events: EventSeats; transactions: TransactionRunner },
) {
  return async function markPaidManually(input: MarkPaidManuallyInput) {
    return deps.transactions.run(async (tx) => {
      // Locking the event serializes double clicks: the second one sees "paid" and stops.
      const event = await deps.events.lock(input.eventId, tx);
      if (!event || event.status === "cancelled") throw new EventNotOpenError(input.eventId);

      const registration = await deps.registrations.findInEvent(input.registrationId, event.id, tx);
      if (!registration || registration.status === "cancelled") {
        throw new RegistrationNotFoundError(input.registrationId);
      }
      if (registration.status === "paid") return { alreadyPaid: true };
      // Paying doesn't buy a seat: a waitlisted player waits for one to free up (HU-12).
      if (registration.status === "waitlisted") throw new EventFullError(event.id);

      await recordPaid(deps, { ...input, event }, tx);
      return { alreadyPaid: false };
    });
  };
}
