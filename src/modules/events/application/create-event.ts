import { eventSharePath, newEvent, type NewEventProps } from "../domain/event";
import type { ClubReader, EventRepository, VenueBook } from "./ports";
import { assertCommunityInClub, requireClub } from "./require-club";

export type CreateEventInput = Omit<NewEventProps, "clubId"> & { clubSlug: string };

export function makeCreateEvent(deps: {
  clubs: ClubReader;
  events: EventRepository;
  venues: VenueBook;
  now: () => Date;
}) {
  return async function createEvent(input: CreateEventInput) {
    const { clubSlug, ...props } = input;
    const club = await requireClub(deps.clubs, clubSlug);
    assertCommunityInClub(club, props.communityId);

    const event = newEvent({ ...props, clubId: club.id }, deps.now());
    const { id } = await deps.events.create(event);
    await deps.venues.remember(club.id, { name: event.venueName, mapsUrl: event.mapsUrl });
    return { id, sharePath: eventSharePath(club.slug, id) };
  };
}
