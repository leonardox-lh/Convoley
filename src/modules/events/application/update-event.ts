import {
  assertCapacityCoversConfirmed,
  assertEditable,
  statusAfterCapacityChange,
  validateEventDetails,
  type EventDetailsProps,
} from "../domain/event";
import { EventNotFoundError } from "../domain/errors";
import type { ClubReader, EventRepository, RegistrationsReader, TransactionRunner } from "./ports";
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
  now: () => Date;
}) {
  return async function updateEvent(input: UpdateEventInput) {
    const { clubSlug, eventId, publish, ...details } = input;
    const club = await requireClub(deps.clubs, clubSlug);
    assertCommunityInClub(club, details.communityId);
    validateEventDetails(details, deps.now());

    // The row lock keeps a registration from sneaking in between the count and the update.
    return deps.transactions.run(async (tx) => {
      const current = await deps.events.lockInClub(club.id, eventId, tx);
      if (!current) throw new EventNotFoundError(eventId);
      assertEditable(current.status);

      const confirmed = await deps.registrations.countConfirmed(eventId, tx);
      assertCapacityCoversConfirmed(details.capacity, confirmed);

      const baseStatus = current.status === "draft" && publish ? "published" : current.status;
      const status = statusAfterCapacityChange(baseStatus, details.capacity, confirmed);
      await deps.events.update(eventId, { ...details, status }, tx);
      return { status };
    });
  };
}
