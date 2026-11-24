import type { EventStatus, NewEvent } from "../domain/event";

export interface ClubSummary {
  id: string;
  slug: string;
  name: string;
  communities: { id: string; name: string }[];
}

/** Club data owned by the `clubs` module, read through its public API. */
export interface ClubReader {
  findBySlug(slug: string): Promise<ClubSummary | null>;
}

export type EventDetails = Omit<NewEvent, "status"> & {
  id: string;
  status: EventStatus;
  communityName: string;
};

export interface EventRepository {
  create(event: NewEvent): Promise<{ id: string }>;
  findInClub(clubId: string, eventId: string): Promise<EventDetails | null>;
}
