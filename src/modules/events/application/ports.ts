import type {
  CancellationOutcome,
  EventDetailsProps,
  EventStatus,
  NewEvent,
} from "../domain/event";
import type { RecurrenceProps } from "../domain/recurrence";

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
  cancellationOutcome: CancellationOutcome | null;
};

declare const transactionBrand: unique symbol;
/** Handle of a running database transaction; only infrastructure looks inside it. */
export type TransactionContext = { readonly [transactionBrand]: true };

export interface TransactionRunner {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface EventRepository {
  create(event: NewEvent): Promise<{ id: string }>;
  findInClub(clubId: string, eventId: string): Promise<EventDetails | null>;
  /** Events of the club in these statuses starting at or after `from`, soonest first. */
  listInClub(
    clubId: string,
    filter: { statuses: readonly EventStatus[]; from: Date },
  ): Promise<EventDetails[]>;
  /** Reads the event and locks its row until the transaction ends. */
  lockInClub(clubId: string, eventId: string, tx: TransactionContext): Promise<EventDetails | null>;
  update(
    eventId: string,
    changes: EventDetailsProps & { status: EventStatus },
    tx: TransactionContext,
  ): Promise<void>;
  markCancelled(
    eventId: string,
    cancellation: { at: Date; outcome: CancellationOutcome },
    tx: TransactionContext,
  ): Promise<void>;
}

/** Registrations owned by the `registrations` module. */
export interface RegistrationsReader {
  countConfirmed(eventId: string, tx?: TransactionContext): Promise<number>;
  listIds(eventId: string, tx: TransactionContext): Promise<string[]>;
  /** Gives up to `seats` new seats to the waitlist, first come first served (HU-12). */
  promoteWaitlisted(eventId: string, seats: number, tx: TransactionContext): Promise<number>;
}

/** Confirmed counts of many events in one read, keyed by event id (missing = 0). */
export interface ConfirmedCountsReader {
  countConfirmedByEvent(eventIds: string[]): Promise<Map<string, number>>;
}

/** Payments owned by the `payments` module. */
/** HU-27: plan credits used by the event's registrations go back (owned by `plans`). */
export interface CreditsReturner {
  giveBack(registrationIds: string[], tx: TransactionContext): Promise<void>;
}

export interface PaymentsMarker {
  markForCancellation(
    input: { registrationIds: string[]; outcome: CancellationOutcome },
    tx: TransactionContext,
  ): Promise<void>;
}

/** HU-28: a weekly template and the dates published from it. */
export interface RecurringEvent extends RecurrenceProps {
  id: string;
  clubId: string;
  isPaused: boolean;
}

export interface RecurringEventRepository {
  create(template: Omit<RecurringEvent, "id" | "isPaused">): Promise<{ id: string }>;
  /** Newest first, with the community name for the list. */
  listInClub(clubId: string): Promise<(RecurringEvent & { communityName: string })[]>;
  /** False if the template isn't in this club. */
  setPaused(clubId: string, recurringEventId: string, isPaused: boolean): Promise<boolean>;
  /**
   * Creates the published events for these slots; a slot that already has one (even cancelled
   * or rescheduled) is skipped, so concurrent calls never duplicate a date.
   */
  publishOccurrences(template: RecurringEvent, slots: Date[]): Promise<void>;
}

/** HU-34: stores the court cost of one of the club's events; false if it isn't the club's. */
export interface CourtCostWriter {
  set(clubId: string, eventId: string, courtCostCents: number | null): Promise<boolean>;
}
