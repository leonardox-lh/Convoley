import { EventNotOpenError, RegistrationNotFoundError } from "../domain/errors";
import { assertAwaitingPayment } from "../domain/registration";
import type {
  EventSeats,
  RegistrationRepository,
  TransactionRunner,
  VoucherPayments,
} from "./ports";

export interface SubmitVoucherInput {
  registrationId: string;
  image: { bytes: Uint8Array; contentType: string };
  /** Optional Yape security code, as typed. */
  yapeSecurityCode: string | null;
}

/**
 * The player uploads the screenshot of their Yape/Plin payment (HU-14): it is stored privately,
 * recorded as a voucher payment for the event price, and the registration goes to review.
 */
export function makeSubmitVoucher(deps: {
  events: EventSeats;
  registrations: RegistrationRepository;
  vouchers: VoucherPayments;
  transactions: TransactionRunner;
}) {
  return async function submitVoucher(input: SubmitVoucherInput) {
    // Checked before uploading, so a double submit doesn't leave files behind.
    const registration = await deps.transactions.run((tx) =>
      deps.registrations.findById(input.registrationId, tx),
    );
    if (!registration) throw new RegistrationNotFoundError(input.registrationId);
    assertAwaitingPayment(registration);

    const proofFileKey = await deps.vouchers.storeImage(input.image);

    await deps.transactions.run(async (tx) => {
      const event = await deps.events.lock(registration.eventId, tx);
      if (!event || event.status === "cancelled") throw new EventNotOpenError(registration.eventId);
      const current = await deps.registrations.findInEvent(registration.id, event.id, tx);
      if (!current) throw new RegistrationNotFoundError(registration.id);
      assertAwaitingPayment(current);

      // Amount and club come from the locked event, never from the form.
      await deps.vouchers.record(
        {
          clubId: event.clubId,
          registrationId: current.id,
          amountCents: event.priceCents,
          proofFileKey,
          yapeSecurityCode: input.yapeSecurityCode,
        },
        tx,
      );
      await deps.registrations.setStatus(current.id, "in_review", tx);
    });
  };
}
