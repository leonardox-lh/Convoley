import type {
  EventSeatInfo,
  PlayerGender,
  PlayerLevel,
  PlayerPosition,
  RegistrationStatus,
  SignUpStatus,
} from "../domain/registration";
import type { ChargeResult, StoredPaymentStatus } from "../domain/settlement";

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
  /** HU-31: only asked in mixed events. */
  gender?: PlayerGender | null;
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
  ): Promise<{
    id: string;
    eventId: string;
    status: RegistrationStatus;
    phone: string;
    userId: string | null;
  } | null>;
  /** Any status change also ends a reservation (HU-21). */
  setStatus(id: string, status: RegistrationStatus, tx: TransactionContext): Promise<void>;
  /** HU-21: holds the seat of a pending payment until `until`. */
  reserve(id: string, until: Date, tx: TransactionContext): Promise<void>;
  /** HU-21: cancels pending payments whose reservation ended; returns how many seats it freed. */
  releaseExpired(eventId: string, now: Date, tx: TransactionContext): Promise<number>;
}

/** HU-27: plan credits, owned by the `plans` module; they run in our transaction. */
export interface Credits {
  /** Spends one credit for this registration; throws NoCreditError when there is none. */
  consume(
    input: {
      player: { clubId: string; phone: string; userId: string | null };
      event: { communityId: string; startsAt: Date };
      registrationId: string;
    },
    tx: TransactionContext,
  ): Promise<void>;
  /** Gives back the credits and balance (HU-30) these registrations used, if any. */
  giveBack(registrationIds: string[], tx: TransactionContext): Promise<void>;
  /** HU-30: true when it was paid with a plan credit or balance instead of money. */
  paidWithoutMoney(registrationId: string, tx: TransactionContext): Promise<boolean>;
  /** HU-30: keeps the price of a cancelled sign-up as balance in the club. */
  earnBalance(
    input: { clubId: string; phone: string; amountCents: number },
    tx: TransactionContext,
  ): Promise<void>;
  /** HU-30: pays the whole price with balance; throws NoBalanceError when it doesn't cover it. */
  spendBalance(
    input: { clubId: string; phone: string; amountCents: number; registrationId: string },
    tx: TransactionContext,
  ): Promise<void>;
}

/** HU-30: the club's cancellation deadline, owned by the `clubs` module. */
export interface CancellationPolicies {
  deadlineHours(clubId: string): Promise<number | null>;
}

/** HU-22: the club's optional service fee, owned by the `clubs` module. */
export interface ServiceFees {
  forCharge(clubId: string, priceCents: number): Promise<number>;
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
  gender: PlayerGender | null;
  teamNumber: number | null;
  status: RegistrationStatus;
  createdAt: Date;
}

export interface RegistrationListReader {
  listByEvent(eventId: string): Promise<RegistrationListItem[]>;
}

/** HU-31: team numbers, set by the organizer. */
export interface TeamAssignments {
  /** Replaces every team of the event: listed registrations get theirs, the rest none. */
  replaceAll(eventId: string, teams: Map<string, number>): Promise<void>;
  /** False when the registration isn't in the event. */
  setTeam(eventId: string, registrationId: string, teamNumber: number | null): Promise<boolean>;
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

/** A Mercado Pago charge as reported server to server; never built from browser data. */
export interface ChargeReport {
  providerPaymentId: string;
  result: ChargeResult;
  statusDetail: string | null;
  amountCents: number;
  currency: string;
  externalReference: string | null;
}

/** Mercado Pago on the organizer's account, owned by the `payments` module (network). */
export interface MercadoPagoGateway {
  isEnabled(clubId: string): Promise<boolean>;
  charge(
    clubId: string,
    charge: {
      amountCents: number;
      token: string;
      paymentMethodId: string;
      installments: number;
      issuerId: string | null;
      payerEmail: string;
      description: string;
      externalReference: string;
      idempotencyKey: string;
    },
  ): Promise<ChargeReport>;
  find(clubId: string, providerPaymentId: string): Promise<ChargeReport>;
  refund(clubId: string, providerPaymentId: string, idempotencyKey: string): Promise<void>;
  clubIdForAccount(mpUserId: string): Promise<string | null>;
}

export interface StoredMercadoPagoPayment {
  id: string;
  clubId: string;
  registrationId: string | null;
  amountCents: number;
  status: StoredPaymentStatus;
  providerPaymentId: string | null;
}

/** Mercado Pago payment rows, owned by the `payments` module (database). */
export interface MercadoPagoPaymentRecords {
  recordPending(
    payment: {
      clubId: string;
      registrationId: string;
      amountCents: number;
      serviceFeeCents: number;
    },
    tx: TransactionContext,
  ): Promise<{ id: string }>;
  attachProviderId(paymentId: string, providerPaymentId: string): Promise<void>;
  find(
    where: { id: string } | { providerPaymentId: string },
    tx?: TransactionContext,
  ): Promise<StoredMercadoPagoPayment | null>;
  setStatus(
    input: {
      paymentId: string;
      status: Exclude<StoredPaymentStatus, "in_review">;
      statusDetail: string | null;
      providerPaymentId?: string;
    },
    tx?: TransactionContext,
  ): Promise<void>;
}
