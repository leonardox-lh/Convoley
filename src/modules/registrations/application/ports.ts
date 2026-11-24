import type {
  EventSeatInfo,
  PlayerLevel,
  PlayerPosition,
  RegistrationStatus,
  SignUpStatus,
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
  create(
    eventId: string,
    player: PlayerDetails,
    status: SignUpStatus,
    tx: TransactionContext,
  ): Promise<{ id: string }>;
  /** Brings back a cancelled registration with the new details, as a fresh sign-up (new time). */
  reactivate(
    id: string,
    player: PlayerDetails,
    status: SignUpStatus,
    tx: TransactionContext,
  ): Promise<void>;
  /** Moves the first `seats` waitlisted registrations, by arrival, to pending payment. */
  promoteWaitlisted(eventId: string, seats: number, tx: TransactionContext): Promise<number>;
  /** 1-based place in the event's waitlist, or null if the registration isn't waiting. */
  waitlistPosition(id: string, tx: TransactionContext): Promise<number | null>;
  findInEvent(
    id: string,
    eventId: string,
    tx: TransactionContext,
  ): Promise<{ id: string; status: RegistrationStatus } | null>;
  findById(
    id: string,
    tx: TransactionContext,
  ): Promise<{ id: string; eventId: string; status: RegistrationStatus } | null>;
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
  /** Only for waitlisted registrations (HU-12). */
  waitlistPosition: number | null;
}

/** Registrations of a Google account (HU-48). */
export interface PlayerRegistrations {
  listByUser(userId: string): Promise<PlayerRegistration[]>;
  /** Gives the guest registrations made with this phone to the account; returns how many. */
  linkGuestsToUser(phone: string, userId: string): Promise<number>;
}

/** Voucher payments owned by the `payments` module (HU-14). */
export interface VoucherPayments {
  /** Validates the screenshot (format, size) and stores it privately; returns its key. */
  storeImage(image: { bytes: Uint8Array; contentType: string }): Promise<string>;
  record(
    payment: {
      clubId: string;
      registrationId: string;
      amountCents: number;
      proofFileKey: string;
      yapeSecurityCode: string | null;
    },
    tx: TransactionContext,
  ): Promise<void>;
}

/** Voucher reviews owned by the `payments` module (HU-15). */
export interface VoucherReviews {
  findInReview(registrationId: string, tx: TransactionContext): Promise<{ id: string } | null>;
  approve(
    input: { paymentId: string; reviewedByUserId: string; at: Date },
    tx: TransactionContext,
  ): Promise<void>;
  reject(
    input: { paymentId: string; reason: string; reviewedByUserId: string; at: Date },
    tx: TransactionContext,
  ): Promise<void>;
}
