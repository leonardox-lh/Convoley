import {
  assertCapacityCoversConfirmed,
  assertEditable,
  statusAfterCapacityChange,
  validateEventDetails,
  type EventDetailsProps,
} from "../domain/event";
import { EventNotFoundError } from "../domain/errors";
import type {
  ClubReader,
  EventRepository,
  RegistrationsReader,
  TransactionRunner,
  VenueBook,
} from "./ports";
import { assertCommunityInClub, requireClub } from "./require-club";

export type UpdateEventInput = EventDetailsProps & {
  clubSlug: string;
  eventId: string;
  /** Publishes a draft while saving it. */
  publish: boolean;
};

export function makeUpdateEvent(deps: {
  clubs: ClubReader;
  events: EventRepository;
  registrations: RegistrationsReader;
  transactions: TransactionRunner;
  venues: VenueBook;
  now: () => Date;
}) {
  return async function updateEvent(input: UpdateEventInput) {
    const { clubSlug, eventId, publish, ...details } = input;
    const club = await requireClub(deps.clubs, clubSlug);
    assertCommunityInClub(club, details.communityId);
    validateEventDetails(details, deps.now());

    // The row lock keeps a registration from sneaking in between the count and the update.
    const result = await deps.transactions.run(async (tx) => {
      const current = await deps.events.lockInClub(club.id, eventId, tx);
      if (!current) throw new EventNotFoundError(eventId);
      assertEditable(current.status);

      let confirmed = await deps.registrations.countConfirmed(eventId, tx);
      assertCapacityCoversConfirmed(details.capacity, confirmed);

      // New seats go to the waitlist before anyone else can take them (HU-12).
      const freeSeats = details.capacity - confirmed;
      confirmed += await deps.registrations.promoteWaitlisted(eventId, freeSeats, tx);

      const baseStatus = current.status === "draft" && publish ? "published" : current.status;
      const status = statusAfterCapacityChange(baseStatus, details.capacity, confirmed);
      await deps.events.update(eventId, { ...details, status }, tx);
      return { status };
    });
    await deps.venues.remember(club.id, { name: details.venueName, mapsUrl: details.mapsUrl });
    return result;
  };
}
