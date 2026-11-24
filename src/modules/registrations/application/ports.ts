import type {
  EventSeatInfo,
  PlayerLevel,
  PlayerPosition,
  RegistrationStatus,
} from "../domain/registration";

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
  /** Full → published once a spot frees up. */
  reopen(eventId: string, tx: TransactionContext): Promise<void>;
}

export interface PlayerDetails {
  firstName: string;
  lastName: string;
  phone: string;
  /** Null for guests; set when the player signed in with Google. */
  userId: string | null;
  /** Optional, for balanced teams later (HU-10). */
  position?: PlayerPosition | null;
  level?: PlayerLevel | null;
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
  findInEvent(
    id: string,
    eventId: string,
    tx: TransactionContext,
  ): Promise<{ id: string; status: RegistrationStatus } | null>;
  setStatus(id: string, status: RegistrationStatus, tx: TransactionContext): Promise<void>;
}

/** Payments owned by the `payments` module. */
export interface ManualPayments {
  record(
    payment: {
      clubId: string;
      registrationId: string;
      amountCents: number;
      reviewedByUserId: string;
    },
    tx: TransactionContext,
  ): Promise<void>;
}

export interface RegistrationListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  position: PlayerPosition | null;
  level: PlayerLevel | null;
  status: RegistrationStatus;
  createdAt: Date;
}

export interface RegistrationListReader {
  listByEvent(eventId: string): Promise<RegistrationListItem[]>;
}

export interface PlayerRegistration {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  createdAt: Date;
}

/** Registrations of a Google account (HU-48). */
export interface PlayerRegistrations {
  listByUser(userId: string): Promise<PlayerRegistration[]>;
  /** Gives the guest registrations made with this phone to the account; returns how many. */
  linkGuestsToUser(phone: string, userId: string): Promise<number>;
}
