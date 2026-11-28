import type { ClubReader, VenueBook } from "./ports";
import { requireClub } from "./require-club";

type Deps = { clubs: ClubReader; venues: VenueBook };

export function makeListClubVenues(deps: Deps) {
  return async function listClubVenues(clubSlug: string) {
    const club = await requireClub(deps.clubs, clubSlug);
    return deps.venues.listInClub(club.id);
  };
}

/** Takes the place off the club's list; events already held there keep it. */
export function makeRemoveClubVenue(deps: Deps) {
  return async function removeClubVenue(input: { clubSlug: string; venueId: string }) {
    const club = await requireClub(deps.clubs, input.clubSlug);
    await deps.venues.remove(club.id, input.venueId);
  };
}
