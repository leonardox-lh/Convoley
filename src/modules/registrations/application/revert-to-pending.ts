import {
  EventNotOpenError,
  RegistrationNotFoundError,
  RegistrationNotPaidError,
} from "../domain/errors";
import type {
  Credits,
  EventSeats,
  PaymentReversals,
  RegistrationRepository,
  TransactionRunner,
} from "./ports";

export interface RevertToPendingInput {
  eventId: string;
  registrationId: string;
  reviewedByUserId: string;
}

/**
 * The organizer takes back a "paid" (marked by mistake, or the money never arrived): the player
 * keeps their seat and owes the payment again. A plan credit goes back to the plan.
 * Convoley moves no money: a Mercado Pago charge is refunded by the organizer in Mercado Pago.
 */
export function makeRevertToPending(deps: {
  events: EventSeats;
  registrations: RegistrationRepository;
  payments: PaymentReversals;
  credits: Credits;
  transactions: TransactionRunner;
}) {
  return async function revertToPending(input: RevertToPendingInput) {
    return deps.transactions.run(async (tx) => {
      const event = await deps.events.lock(input.eventId, tx);
      // A cancelled event's payments were already marked for refund or balance.
      if (!event || event.status === "cancelled") throw new EventNotOpenError(input.eventId);

      const registration = await deps.registrations.findInEvent(input.registrationId, event.id, tx);
      if (!registration) throw new RegistrationNotFoundError(input.registrationId);
      if (registration.status !== "paid") throw new RegistrationNotPaidError(registration.id);

      const { chargedByMercadoPago } = await deps.payments.revertApproved(
        { registrationId: registration.id, reviewedByUserId: input.reviewedByUserId },
        tx,
      );
      await deps.credits.giveBack([registration.id], tx);
      await deps.registrations.setStatus(registration.id, "pending_payment", tx);
      return { chargedByMercadoPago };
    });
  };
}
