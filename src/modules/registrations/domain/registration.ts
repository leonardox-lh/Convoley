import {
  EventFullError,
  EventNotOpenError,
  InvalidRejectionReasonError,
  PaymentNotExpectedError,
} from "./errors";

/** Registrations that take a spot: everyone signed up who has not cancelled, paid or not. */
export const SEAT_HOLDING_STATUSES = ["pending_payment", "in_review", "paid"] as const;

export type RegistrationStatus =
  (typeof SEAT_HOLDING_STATUSES)[number] | "waitlisted" | "cancelled";

/** Where a new sign-up lands: a seat, or the waitlist when the event is full (HU-12). */
export type SignUpStatus = "pending_payment" | "waitlisted";

export function holdsSeat(status: RegistrationStatus): boolean {
  return (SEAT_HOLDING_STATUSES as readonly string[]).includes(status);
}

/** What registration needs to know about an event; owned by the `events` module. */
export interface EventSeatInfo {
  id: string;
  clubId: string;
  /** HU-27: plan credits are valid per community. */
  communityId: string;
  status: string;
  capacity: number;
  priceCents: number;
  startsAt: Date;
}

/** HU-21: how long a seat waits for a Mercado Pago payment before it frees up. */
export const RESERVATION_MINUTES = 10;
const MS_PER_MINUTE = 60_000;

export function reservationDeadline(now: Date): Date {
  return new Date(now.getTime() + RESERVATION_MINUTES * MS_PER_MINUTE);
}

/** Players can sign up only to published events that haven't started. */
export function isOpenForRegistration(
  event: Pick<EventSeatInfo, "status" | "startsAt">,
  now: Date,
): boolean {
  return event.status === "published" && event.startsAt > now;
}

export function assertSpotAvailable(event: EventSeatInfo, confirmed: number, now: Date): void {
  if (event.status === "full") throw new EventFullError(event.id);
  if (!isOpenForRegistration(event, now)) throw new EventNotOpenError(event.id);
  if (confirmed >= event.capacity) throw new EventFullError(event.id);
}

/**
 * Players join a published or full event that hasn't started; when every seat is taken they
 * go to the waitlist, in arrival order.
 */
export function signUpStatus(event: EventSeatInfo, confirmed: number, now: Date): SignUpStatus {
  const accepting = event.status === "published" || event.status === "full";
  if (!accepting || event.startsAt <= now) throw new EventNotOpenError(event.id);
  return event.status === "full" || confirmed >= event.capacity ? "waitlisted" : "pending_payment";
}

/** Players can see a full event's form, to join its waitlist. */
export function acceptsWaitlist(
  event: Pick<EventSeatInfo, "status" | "startsAt">,
  now: Date,
): boolean {
  return event.status === "full" && event.startsAt > now;
}

/** Taken and free seats of an event; free never goes below zero. */
export function seatSummary(capacity: number, confirmed: number) {
  return { taken: confirmed, free: Math.max(0, capacity - confirmed) };
}

/** Volleyball positions a player can pick when signing up (HU-10). */
export const PLAYER_POSITIONS = [
  "setter",
  "libero",
  "outside_hitter",
  "middle_blocker",
  "opposite",
  "any",
] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const PLAYER_GENDERS = ["female", "male"] as const;
/** HU-31: asked only in mixed events. */
export type PlayerGender = (typeof PLAYER_GENDERS)[number];

export const PLAYER_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type PlayerLevel = (typeof PLAYER_LEVELS)[number];

/**
 * A voucher is accepted only while the player holds a seat and owes the payment: not while
 * waiting, under review, paid or cancelled.
 */
export function assertAwaitingPayment(registration: { id: string; status: RegistrationStatus }) {
  if (registration.status !== "pending_payment") {
    throw new PaymentNotExpectedError(registration.id, registration.status);
  }
}

export const REJECTION_REASON_MAX_LENGTH = 200;

/** The player reads this to fix their payment, so it can't be empty (HU-15). */
export function parseRejectionReason(raw: string): string {
  const reason = raw.trim();
  if (!reason || reason.length > REJECTION_REASON_MAX_LENGTH) {
    throw new InvalidRejectionReasonError();
  }
  return reason;
}
