import { LISTED_STATUSES, remainingSpots } from "../domain/event";
import type { ClubReader, ConfirmedCountsReader, EventRepository } from "./ports";

/** Upcoming published or full events of a club, for its public page. Null if the club doesn't exist. */
export function makeListOpenEvents(deps: {
  clubs: ClubReader;
  events: EventRepository;
  registrations: ConfirmedCountsReader;
  /** HU-28: weekly dates appear when the club's page is opened. */
  publishDueOccurrences: (clubId: string) => Promise<void>;
  now: () => Date;
}) {
  return async function listOpenEvents(clubSlug: string) {
    const club = await deps.clubs.findBySlug(clubSlug);
    if (!club) return null;
    await deps.publishDueOccurrences(club.id);
    const events = await deps.events.listInClub(club.id, {
      statuses: LISTED_STATUSES,
      from: deps.now(),
    });
    if (events.length === 0) return [];
    const confirmed = await deps.registrations.countConfirmedByEvent(events.map((e) => e.id));
    return events.map((event) => ({
      ...event,
      remainingSpots: remainingSpots(event.capacity, confirmed.get(event.id) ?? 0),
    }));
  };
}

/** Upcoming published or full events of every club, for the home page. */
export function makeListUpcomingEvents(deps: {
  events: EventRepository;
  registrations: ConfirmedCountsReader;
  now: () => Date;
}) {
  return async function listUpcomingEvents(limit: number) {
    const events = await deps.events.listUpcoming({
      statuses: LISTED_STATUSES,
      from: deps.now(),
      limit,
    });
    if (events.length === 0) return [];
    const confirmed = await deps.registrations.countConfirmedByEvent(events.map((e) => e.id));
    return events.map((event) => ({
      ...event,
      remainingSpots: remainingSpots(event.capacity, confirmed.get(event.id) ?? 0),
    }));
  };
}
