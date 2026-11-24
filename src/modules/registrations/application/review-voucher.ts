import {
  EventNotOpenError,
  NothingToReviewError,
  RegistrationNotFoundError,
} from "../domain/errors";
import { parseRejectionReason } from "../domain/registration";
import type {
  EventSeats,
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
  VoucherReviews,
} from "./ports";

interface ReviewDeps {
  events: EventSeats;
  registrations: RegistrationRepository;
  reviews: VoucherReviews;
  transactions: TransactionRunner;
  now: () => Date;
}

export interface ReviewVoucherInput {
  eventId: string;
  registrationId: string;
  reviewedByUserId: string;
}

/** Locks the event and finds the registration's voucher waiting for review. */
async function voucherToReview(
  deps: ReviewDeps,
  input: ReviewVoucherInput,
  tx: TransactionContext,
) {
  // The lock serializes double clicks and two organizers reviewing at once.
  const event = await deps.events.lock(input.eventId, tx);
  if (!event || event.status === "cancelled") throw new EventNotOpenError(input.eventId);
  const registration = await deps.registrations.findInEvent(input.registrationId, event.id, tx);
  if (!registration) throw new RegistrationNotFoundError(input.registrationId);
  const voucher =
    registration.status === "in_review"
      ? await deps.reviews.findInReview(registration.id, tx)
      : null;
  if (!voucher) throw new NothingToReviewError(registration.id);
  return { registration, voucher };
}

/** One click: the voucher is approved and the player is "paid" (HU-15). */
export function makeApproveVoucher(deps: ReviewDeps) {
  return async function approveVoucher(input: ReviewVoucherInput) {
    await deps.transactions.run(async (tx) => {
      const { registration, voucher } = await voucherToReview(deps, input, tx);
      await deps.reviews.approve(
        { paymentId: voucher.id, reviewedByUserId: input.reviewedByUserId, at: deps.now() },
        tx,
      );
      await deps.registrations.setStatus(registration.id, "paid", tx);
    });
  };
}

/**
 * Rejected with a reason the player sees; they keep their seat and go back to "pending
 * payment" so they can upload a correct screenshot.
 */
export function makeRejectVoucher(deps: ReviewDeps) {
  return async function rejectVoucher(input: ReviewVoucherInput & { reason: string }) {
    const reason = parseRejectionReason(input.reason);
    await deps.transactions.run(async (tx) => {
      const { registration, voucher } = await voucherToReview(deps, input, tx);
      await deps.reviews.reject(
        {
          paymentId: voucher.id,
          reason,
          reviewedByUserId: input.reviewedByUserId,
          at: deps.now(),
        },
        tx,
      );
      await deps.registrations.setStatus(registration.id, "pending_payment", tx);
    });
  };
}
