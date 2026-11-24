import { db } from "@/lib/db";
import { makeCancelEvent } from "./application/cancel-event";
import { makeCreateEvent } from "./application/create-event";
import { makeGetOrganizerEvent } from "./application/get-organizer-event";
import { makeGetPublicEvent } from "./application/get-public-event";
import { makeUpdateEvent } from "./application/update-event";
import { clubsAdapter } from "./infrastructure/clubs-adapter";
import { paymentsAdapter } from "./infrastructure/payments-adapter";
import { PrismaEventRepository } from "./infrastructure/prisma-event-repository";
import { prismaTransactions } from "./infrastructure/prisma-transactions";
import { registrationsAdapter } from "./infrastructure/registrations-adapter";

const events = new PrismaEventRepository(db);
const transactions = prismaTransactions(db);
const now = () => new Date();

export const createEvent = makeCreateEvent({ clubs: clubsAdapter, events, now });
export const getPublicEvent = makeGetPublicEvent({ clubs: clubsAdapter, events });
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
  transactions,
  now,
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
  InvalidPriceError,
} from "./domain/errors";
