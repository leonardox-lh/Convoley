import { InvalidCancellationPolicyError } from "./errors";

/** A week: enough for any weekly game. */
export const MAX_CANCELLATION_DEADLINE_HOURS = 168;

/** HU-30: hours before the start; null = no policy (no balance in favor). */
export function parseCancellationDeadlineHours(hours: number | null): number | null {
  if (hours === null) return null;
  if (!Number.isInteger(hours) || hours < 0 || hours > MAX_CANCELLATION_DEADLINE_HOURS) {
    throw new InvalidCancellationPolicyError();
  }
  return hours;
}
