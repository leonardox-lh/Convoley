import { EventFullError, EventNotOpenError } from "./errors";

/** Registrations that take a spot: everyone signed up who has not cancelled, paid or not. */
export const SEAT_HOLDING_STATUSES = ["pending_payment", "in_review", "paid"] as const;

export type RegistrationStatus = (typeof SEAT_HOLDING_STATUSES)[number] | "cancelled";

/** What registration needs to know about an event; owned by the `events` module. */
export interface EventSeatInfo {
  id: string;
  status: string;
  capacity: number;
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
