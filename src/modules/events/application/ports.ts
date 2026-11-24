import type {
  CancellationOutcome,
  EventDetailsProps,
  EventStatus,
  NewEvent,
} from "../domain/event";

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
}

/** Payments owned by the `payments` module. */
export interface PaymentsMarker {
  markForCancellation(
    input: { registrationIds: string[]; outcome: CancellationOutcome },
    tx: TransactionContext,
  ): Promise<void>;
}
