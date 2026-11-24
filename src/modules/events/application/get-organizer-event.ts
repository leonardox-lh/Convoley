import { eventSharePath } from "../domain/event";
import type { ClubReader, EventRepository, RegistrationsReader } from "./ports";

/** The event in any status, with what the organizer needs to edit or cancel it. */
export function makeGetOrganizerEvent(deps: {
  clubs: ClubReader;
  events: EventRepository;
  registrations: RegistrationsReader;
}) {
  return async function getOrganizerEvent(input: { clubSlug: string; eventId: string }) {
    const club = await deps.clubs.findBySlug(input.clubSlug);
    if (!club) return null;
    const event = await deps.events.findInClub(club.id, input.eventId);
    if (!event) return null;
    return {
      ...event,
      confirmedCount: await deps.registrations.countConfirmed(event.id),
      sharePath: eventSharePath(club.slug, event.id),
      club,
    };
  };
}
