import { parseCancellationDeadlineHours } from "../domain/cancellation-policy";
import { ClubNotFoundError } from "../domain/errors";
import type { PaymentSettingsRepository } from "./ports";

/** HU-30: the admin sets until when a cancelling player keeps what they paid as balance. */
export function makeUpdateCancellationPolicy(deps: { settings: PaymentSettingsRepository }) {
  return async function updateCancellationPolicy(input: {
    clubSlug: string;
    deadlineHours: number | null;
  }) {
    const hours = parseCancellationDeadlineHours(input.deadlineHours);
    if (!(await deps.settings.find(input.clubSlug))) throw new ClubNotFoundError(input.clubSlug);
    await deps.settings.update(input.clubSlug, { cancellationDeadlineHours: hours });
  };
}
