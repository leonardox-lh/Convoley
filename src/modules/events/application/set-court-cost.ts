import { validateCourtCost } from "../domain/event";
import { EventNotFoundError } from "../domain/errors";
import type { ClubReader, CourtCostWriter } from "./ports";
import { requireClub } from "./require-club";

/** HU-34: the organizer records what the court cost, to see the event's profit. */
export function makeSetCourtCost(deps: { clubs: ClubReader; courtCosts: CourtCostWriter }) {
  return async function setCourtCost(input: {
    clubSlug: string;
    eventId: string;
    courtCostCents: number | null;
  }) {
    validateCourtCost(input.courtCostCents);
    const club = await requireClub(deps.clubs, input.clubSlug);
    const found = await deps.courtCosts.set(club.id, input.eventId, input.courtCostCents);
    if (!found) throw new EventNotFoundError(input.eventId);
  };
}
