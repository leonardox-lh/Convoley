export const CANCELLATION_OUTCOMES = ["refund", "balance"] as const;
/** Refund the money or keep it as balance for a future event. A mark only: no money moves. */
export type CancellationOutcome = (typeof CANCELLATION_OUTCOMES)[number];

/** Payments where the player's money already reached (or may have reached) the organizer. */
export const PAYMENT_STATUSES_WITH_MONEY = ["approved", "in_review"] as const;
