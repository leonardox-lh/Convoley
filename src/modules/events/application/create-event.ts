import { eventSharePath, newEvent, type NewEventProps } from "../domain/event";
import { ClubNotFoundError, CommunityNotInClubError } from "../domain/errors";
import type { ClubReader, EventRepository } from "./ports";

export type CreateEventInput = Omit<NewEventProps, "clubId"> & { clubSlug: string };

export function makeCreateEvent(deps: {
  clubs: ClubReader;
  events: EventRepository;
  now: () => Date;
}) {
  return async function createEvent(input: CreateEventInput) {
    const { clubSlug, ...props } = input;
    const club = await deps.clubs.findBySlug(clubSlug);
    if (!club) throw new ClubNotFoundError(clubSlug);
    if (!club.communities.some((community) => community.id === props.communityId)) {
      throw new CommunityNotInClubError(props.communityId);
    }

    const event = newEvent({ ...props, clubId: club.id }, deps.now());
    const { id } = await deps.events.create(event);
    return { id, sharePath: eventSharePath(club.slug, id) };
  };
}
