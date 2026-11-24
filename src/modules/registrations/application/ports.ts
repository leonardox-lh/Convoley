import type { EventSeatInfo, RegistrationStatus } from "../domain/registration";

declare const transactionBrand: unique symbol;
/** Handle of a running database transaction; only infrastructure looks inside it. */
export type TransactionContext = { readonly [transactionBrand]: true };

export interface TransactionRunner {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

/** Event seats owned by the `events` module. */
export interface EventSeats {
  /** Reads the event and locks its row until the transaction ends, so seats can't be oversold. */
  lock(eventId: string, tx: TransactionContext): Promise<EventSeatInfo | null>;
  markFull(eventId: string, tx: TransactionContext): Promise<void>;
}

export interface PlayerDetails {
  firstName: string;
  lastName: string;
  phone: string;
  /** Null for guests; set when the player signed in with Google. */
  userId: string | null;
}

export interface RegistrationRepository {
  countConfirmed(eventId: string, tx: TransactionContext): Promise<number>;
  findByPhone(
    eventId: string,
    phone: string,
    tx: TransactionContext,
  ): Promise<{ id: string; status: RegistrationStatus } | null>;
  create(eventId: string, player: PlayerDetails, tx: TransactionContext): Promise<{ id: string }>;
  /** Brings back a cancelled registration as pending payment, with the new details. */
  reactivate(id: string, player: PlayerDetails, tx: TransactionContext): Promise<void>;
}
