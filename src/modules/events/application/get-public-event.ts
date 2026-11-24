import type { ClubReader, EventRepository } from "./ports";

/** The event as players see it from the shared link; drafts stay hidden. */
export function makeGetPublicEvent(deps: { clubs: ClubReader; events: EventRepository }) {
  return async function getPublicEvent(input: { clubSlug: string; eventId: string }) {
    const club = await deps.clubs.findBySlug(input.clubSlug);
    if (!club) return null;
    const event = await deps.events.findInClub(club.id, input.eventId);
    if (!event || event.status === "draft") return null;
    return { ...event, clubName: club.name };
  };
}
