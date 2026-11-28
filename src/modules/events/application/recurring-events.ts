import { RecurringEventNotFoundError } from "../domain/errors";
import { dueOccurrences, type RecurrenceProps, validateRecurrence } from "../domain/recurrence";
import type { ClubReader, RecurringEventRepository, VenueBook } from "./ports";
import { assertCommunityInClub, requireClub } from "./require-club";

type Deps = {
  clubs: ClubReader;
  recurring: RecurringEventRepository;
  venues: VenueBook;
  now: () => Date;
};

/**
 * HU-28: publishes the dates of the club's active templates whose window has opened. Runs when
 * the club's pages are opened instead of on a cron: a date nobody looks at can wait to exist.
 */
export function makePublishDueOccurrences(deps: Pick<Deps, "recurring" | "now">) {
  return async function publishDueOccurrences(clubId: string): Promise<void> {
    const now = deps.now();
    const templates = await deps.recurring.listInClub(clubId);
    for (const template of templates) {
      const slots = dueOccurrences(template, now);
      if (slots.length > 0) await deps.recurring.publishOccurrences(template, slots);
    }
  };
}

export type CreateRecurringEventInput = RecurrenceProps & { clubSlug: string };

export function makeCreateRecurringEvent(deps: Deps) {
  const publishDue = makePublishDueOccurrences(deps);
  return async function createRecurringEvent(input: CreateRecurringEventInput) {
    const { clubSlug, ...props } = input;
    const club = await requireClub(deps.clubs, clubSlug);
    assertCommunityInClub(club, props.communityId);
    validateRecurrence(props, deps.now());
    const { id } = await deps.recurring.create({ ...props, clubId: club.id });
    await deps.venues.remember(club.id, { name: props.venueName, mapsUrl: props.mapsUrl });
    await publishDue(club.id);
    return { id };
  };
}

export function makeListRecurringEvents(deps: Deps) {
  return async function listRecurringEvents(clubSlug: string) {
    const club = await requireClub(deps.clubs, clubSlug);
    return deps.recurring.listInClub(club.id);
  };
}

/** Pausing keeps the dates already published; resuming never creates past ones. */
export function makeSetRecurringEventPaused(deps: Deps) {
  const publishDue = makePublishDueOccurrences(deps);
  return async function setRecurringEventPaused(input: {
    clubSlug: string;
    recurringEventId: string;
    isPaused: boolean;
  }) {
    const club = await requireClub(deps.clubs, input.clubSlug);
    const found = await deps.recurring.setPaused(club.id, input.recurringEventId, input.isPaused);
    if (!found) throw new RecurringEventNotFoundError(input.recurringEventId);
    if (!input.isPaused) await publishDue(club.id);
  };
}
