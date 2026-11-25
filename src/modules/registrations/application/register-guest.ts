import { DuplicateRegistrationError, EventNotOpenError } from "../domain/errors";
import { PhoneNumber } from "../domain/phone-number";
import {
  assertSpotAvailable,
  reservationDeadline,
  signUpStatus,
  type PlayerGender,
  type PlayerLevel,
  type PlayerPosition,
  type SignUpStatus,
} from "../domain/registration";
import type {
  EventSeats,
  RegistrationRepository,
  TransactionContext,
  TransactionRunner,
} from "./ports";
import { releaseExpiredReservations } from "./seats";

export interface RegisterGuestInput {
  eventId: string;
  firstName: string;
  lastName: string;
  phone: string;
  userId: string | null;
  position?: PlayerPosition | null;
  level?: PlayerLevel | null;
  /** HU-31: asked only in mixed events. */
  gender?: PlayerGender | null;
}

interface RegisterPlayerDeps {
  events: EventSeats;
  registrations: RegistrationRepository;
  now: () => Date;
}

/**
 * The sign-up rules, inside the caller's transaction: shared by guests and manual adds.
 * Players join the waitlist of a full event; the organizer's manual add needs a free seat.
 */
export async function registerPlayer(
  deps: RegisterPlayerDeps,
  input: RegisterGuestInput & { allowWaitlist: boolean },
  tx: TransactionContext,
) {
  const phone = PhoneNumber.parse(input.phone).value;
  const player = {
    firstName: input.firstName,
    lastName: input.lastName,
    phone,
    userId: input.userId,
    position: input.position ?? null,
    level: input.level ?? null,
    gender: input.gender ?? null,
  };

  // The lock serializes sign-ups to this event: the count below can't go stale.
  const locked = await deps.events.lock(input.eventId, tx);
  if (!locked) throw new EventNotOpenError(input.eventId);
  const event = await releaseExpiredReservations(deps, locked, deps.now(), tx);

  const existing = await deps.registrations.findByPhone(event.id, phone, tx);
  if (existing && existing.status !== "cancelled") throw new DuplicateRegistrationError(event.id);

  const confirmed = await deps.registrations.countConfirmed(event.id, tx);
  let status: SignUpStatus = "pending_payment";
  if (input.allowWaitlist) status = signUpStatus(event, confirmed, deps.now());
  else assertSpotAvailable(event, confirmed, deps.now());

  let id: string;
  if (existing) {
    await deps.registrations.reactivate(existing.id, player, status, tx);
    id = existing.id;
  } else {
    ({ id } = await deps.registrations.create(event.id, player, status, tx));
  }
  const tookLastSeat = status === "pending_payment" && confirmed + 1 >= event.capacity;
  if (tookLastSeat) await deps.events.markFull(event.id, tx);

  return { id, event, status };
}

export function makeRegisterGuest(
  deps: RegisterPlayerDeps & {
    transactions: TransactionRunner;
    /** Clubs that charge through Mercado Pago hold the seat only while the player pays. */
    mercadoPago: { isEnabled(clubId: string): Promise<boolean> };
  },
) {
  return async function registerGuest(input: RegisterGuestInput) {
    return deps.transactions.run(async (tx) => {
      const { id, event, status } = await registerPlayer(
        deps,
        { ...input, allowWaitlist: true },
        tx,
      );
      const waitlistPosition =
        status === "waitlisted" ? await deps.registrations.waitlistPosition(id, tx) : null;
      let reservedUntil: Date | null = null;
      if (status === "pending_payment" && (await deps.mercadoPago.isEnabled(event.clubId))) {
        reservedUntil = reservationDeadline(deps.now());
        await deps.registrations.reserve(id, reservedUntil, tx);
      }
      return { id, status, waitlistPosition, reservedUntil };
    });
  };
}
