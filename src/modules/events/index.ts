import { db } from "@/lib/db";
import { makeCancelEvent } from "./application/cancel-event";
import { makeCreateEvent } from "./application/create-event";
import { makeGetOrganizerEvent } from "./application/get-organizer-event";
import { makeGetPublicEvent } from "./application/get-public-event";
import { makeListOpenEvents } from "./application/list-open-events";
import {
  makeCreateRecurringEvent,
  makeListRecurringEvents,
  makePublishDueOccurrences,
  makeSetRecurringEventPaused,
} from "./application/recurring-events";
import { makeSetCourtCost } from "./application/set-court-cost";
import { makeUpdateEvent } from "./application/update-event";
import { prismaRecurringEventRepository } from "./infrastructure/prisma-recurring-event-repository";
import { isClubWritable } from "./infrastructure/billing-adapter";
import { prismaCourtCostWriter } from "./infrastructure/prisma-event-summaries";
import { clubsAdapter } from "./infrastructure/clubs-adapter";
import { paymentsAdapter } from "./infrastructure/payments-adapter";
import { creditsAdapter } from "./infrastructure/plans-adapter";
import { PrismaEventRepository } from "./infrastructure/prisma-event-repository";
import { prismaTransactions } from "./infrastructure/prisma-transactions";
import { registrationsAdapter } from "./infrastructure/registrations-adapter";

const events = new PrismaEventRepository(db);
const transactions = prismaTransactions(db);
const now = () => new Date();
const recurring = prismaRecurringEventRepository(db);
const publishDue = makePublishDueOccurrences({ recurring, now });
// HU-35: a read-only club keeps its published dates but gets no new recurring ones.
const publishDueOccurrences = async (clubId: string) => {
  if (await isClubWritable(clubId)) await publishDue(clubId);
};

export const createEvent = makeCreateEvent({ clubs: clubsAdapter, events, now });
export const getPublicEvent = makeGetPublicEvent({ clubs: clubsAdapter, events });
export const listOpenEvents = makeListOpenEvents({
  clubs: clubsAdapter,
  events,
  registrations: registrationsAdapter,
  publishDueOccurrences,
  now,
});
export const getOrganizerEvent = makeGetOrganizerEvent({
  clubs: clubsAdapter,
  events,
  registrations: registrationsAdapter,
});
export const updateEvent = makeUpdateEvent({
  clubs: clubsAdapter,
  events,
  registrations: registrationsAdapter,
  transactions,
  now,
});
export const cancelEvent = makeCancelEvent({
  clubs: clubsAdapter,
  events,
  registrations: registrationsAdapter,
  payments: paymentsAdapter,
  credits: creditsAdapter,
  transactions,
  now,
});

// HU-28: weekly events.
const recurringDeps = { clubs: clubsAdapter, recurring, now };
export const createRecurringEvent = makeCreateRecurringEvent(recurringDeps);
export const listRecurringEvents = makeListRecurringEvents(recurringDeps);
export const setRecurringEventPaused = makeSetRecurringEventPaused(recurringDeps);
export type { CreateRecurringEventInput } from "./application/recurring-events";
export { MAX_PUBLISH_DAYS_BEFORE } from "./domain/recurrence";

export {
  lockEventForRegistration,
  markEventFull,
  reopenEvent,
} from "./infrastructure/prisma-event-seats";
export {
  listClubEventsForFinance,
  listEventSummaries,
  listEventsStartingBetween,
} from "./infrastructure/prisma-event-summaries";
// HU-34: finance.
export const setCourtCost = makeSetCourtCost({
  clubs: clubsAdapter,
  courtCosts: prismaCourtCostWriter,
});
export type { CreateEventInput } from "./application/create-event";
export type { UpdateEventInput } from "./application/update-event";
export type { CancelEventInput } from "./application/cancel-event";
export {
  CANCELLATION_OUTCOMES,
  EVENT_STATUSES,
  type CancellationOutcome,
  type EventStatus,
  type InitialEventStatus,
} from "./domain/event";
export {
  CapacityBelowConfirmedError,
  ClubNotFoundError,
  CommunityNotInClubError,
  EventAlreadyCancelledError,
  EventInPastError,
  EventNotEditableError,
  EventNotFoundError,
  InvalidCapacityError,
  InvalidMapsUrlError,
  InvalidCourtCostError,
  InvalidPriceError,
  InvalidRecurrenceError,
  RecurringEventNotFoundError,
} from "./domain/errors";
