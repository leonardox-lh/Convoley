import { db } from "@/lib/db";
import { makeCreateEvent } from "./application/create-event";
import { makeGetPublicEvent } from "./application/get-public-event";
import { clubsAdapter } from "./infrastructure/clubs-adapter";
import { PrismaEventRepository } from "./infrastructure/prisma-event-repository";

const events = new PrismaEventRepository(db);

export const createEvent = makeCreateEvent({
  clubs: clubsAdapter,
  events,
  now: () => new Date(),
});
export const getPublicEvent = makeGetPublicEvent({ clubs: clubsAdapter, events });

export type { CreateEventInput } from "./application/create-event";
export { EVENT_STATUSES, type EventStatus, type InitialEventStatus } from "./domain/event";
export {
  ClubNotFoundError,
  CommunityNotInClubError,
  EventInPastError,
  InvalidCapacityError,
  InvalidMapsUrlError,
  InvalidPriceError,
} from "./domain/errors";
