import type { RegistrationStatus } from "./registration";

/** A Mercado Pago charge as we read it: approved, rejected or still pending. */
export type ChargeResult = "approved" | "rejected" | "pending";

/** Our side of the payment row: pending until Mercado Pago's final answer is applied. */
export type StoredPaymentStatus =
  "pending" | "in_review" | "approved" | "rejected" | "refund_pending" | "refunded";

export type Settlement =
  | "ignore"
  | "keep_pending"
  | "mark_rejected"
  | "mark_paid"
  | "take_free_seat"
  | "refund_to_waitlist"
  | "refund"
  | "retry_refund";

const FINAL_PAYMENT_STATUSES: StoredPaymentStatus[] = ["approved", "rejected", "refunded"];

/**
 * What to do with a Mercado Pago answer (HU-20). Applying it twice changes nothing: a payment
 * already settled is ignored. Approved money that can't buy a seat goes back to the player.
 */
export function settlementDecision(input: {
  charge: ChargeResult;
  paymentStatus: StoredPaymentStatus;
  registrationStatus: RegistrationStatus;
  eventCancelled: boolean;
  freeSeat: boolean;
}): Settlement {
  if (FINAL_PAYMENT_STATUSES.includes(input.paymentStatus)) return "ignore";
  if (input.paymentStatus === "refund_pending") return "retry_refund";
  if (input.charge === "pending") return "keep_pending";
  if (input.charge === "rejected") return "mark_rejected";

  if (input.eventCancelled) return "refund";
  switch (input.registrationStatus) {
    case "pending_payment":
    case "in_review":
      return "mark_paid";
    case "paid":
      // Paid twice (another attempt or a voucher got there first): return this one.
      return "refund";
    case "cancelled":
    case "waitlisted":
      return input.freeSeat ? "take_free_seat" : "refund_to_waitlist";
  }
}
