import { CancellationNotAllowedError } from "./errors";
import type { RegistrationStatus } from "./registration";

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * HU-30: what a player keeps when cancelling their own sign-up.
 * - `nothing_paid`: they hadn't paid; the seat is simply freed.
 * - `balance`: paid with money before the deadline; the price becomes balance in the club.
 * - `returned`: paid with a plan credit or balance before the deadline; it goes back.
 * - `forfeited`: paid, but past the deadline (or the club has no policy); it is lost.
 */
export type CancellationResult = "nothing_paid" | "balance" | "returned" | "forfeited";

/** Last moment to cancel keeping the payment, or null when the club has no policy. */
export function cancellationDeadline(startsAt: Date, deadlineHours: number | null): Date | null {
  if (deadlineHours === null) return null;
  return new Date(startsAt.getTime() - deadlineHours * MS_PER_HOUR);
}

export function cancellationResult(input: {
  status: RegistrationStatus;
  paidWithoutMoney: boolean;
  startsAt: Date;
  now: Date;
  deadlineHours: number | null;
}): CancellationResult {
  if (input.status === "cancelled") throw new CancellationNotAllowedError("already_cancelled");
  // The organizer is reviewing a voucher: wait for their answer so no payment is left dangling.
  if (input.status === "in_review") throw new CancellationNotAllowedError("payment_in_review");
  if (input.startsAt <= input.now) throw new CancellationNotAllowedError("event_started");
  if (input.status !== "paid") return "nothing_paid";
  const deadline = cancellationDeadline(input.startsAt, input.deadlineHours);
  if (!deadline || input.now > deadline) return "forfeited";
  return input.paidWithoutMoney ? "returned" : "balance";
}
