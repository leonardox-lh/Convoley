import { EventFullError, EventNotOpenError } from "./errors";

/** Registrations that take a spot: everyone signed up who has not cancelled, paid or not. */
export const SEAT_HOLDING_STATUSES = ["pending_payment", "in_review", "paid"] as const;

export type RegistrationStatus = (typeof SEAT_HOLDING_STATUSES)[number] | "cancelled";

/** What registration needs to know about an event; owned by the `events` module. */
export interface EventSeatInfo {
  id: string;
  clubId: string;
  status: string;
  capacity: number;
  priceCents: number;
  startsAt: Date;
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

export const PLAYER_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type PlayerLevel = (typeof PLAYER_LEVELS)[number];
