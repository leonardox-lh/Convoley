import type { EventSeatInfo } from "../domain/registration";
import type { EventSeats, RegistrationRepository, TransactionContext } from "./ports";

interface SeatDeps {
  events: EventSeats;
  registrations: RegistrationRepository;
}

/**
 * Freed seats go to the waitlist by arrival (HU-12); with nobody left waiting, a full event
 * reopens. Returns the event as it is now. Call it inside the transaction holding the event lock.
 */
export async function fillFreedSeats(
  deps: SeatDeps,
  event: EventSeatInfo,
  freed: number,
  tx: TransactionContext,
): Promise<EventSeatInfo> {
  if (freed <= 0) return event;
  const promoted = await deps.registrations.promoteWaitlisted(event.id, freed, tx);
  if (promoted >= freed || event.status !== "full") return event;
  await deps.events.reopen(event.id, tx);
  return { ...event, status: "published" };
}

/** HU-21: a reservation that ended without payment gives its seat back. Needs the event lock. */
export async function releaseExpiredReservations(
  deps: SeatDeps,
  event: EventSeatInfo,
  now: Date,
  tx: TransactionContext,
): Promise<EventSeatInfo> {
  if (event.status === "cancelled") return event;
  const freed = await deps.registrations.releaseExpired(event.id, now, tx);
  return fillFreedSeats(deps, event, freed, tx);
}
