export class InvalidPhoneNumberError extends Error {
  constructor(readonly phone: string) {
    super(`Not a Peruvian mobile number: "${phone}"`);
    this.name = "InvalidPhoneNumberError";
  }
}

/** HU-27: the player has no active plan with credits for this event. */
export class NoCreditError extends Error {
  constructor() {
    super("No plan credit available for this event");
    this.name = "NoCreditError";
  }
}

export class EventNotOpenError extends Error {
  constructor(readonly eventId: string) {
    super(`Event ${eventId} is not open for registration`);
    this.name = "EventNotOpenError";
  }
}

export class EventFullError extends Error {
  constructor(readonly eventId: string) {
    super(`Event ${eventId} has no spots left`);
    this.name = "EventFullError";
  }
}

export class DuplicateRegistrationError extends Error {
  constructor(readonly eventId: string) {
    super(`This phone is already registered for event ${eventId}`);
    this.name = "DuplicateRegistrationError";
  }
}

export class RegistrationNotFoundError extends Error {
  constructor(readonly registrationId: string) {
    super(`Registration ${registrationId} not found in this event`);
    this.name = "RegistrationNotFoundError";
  }
}

/** Only a registration with a seat that hasn't paid yet can send a voucher (HU-14). */
export class PaymentNotExpectedError extends Error {
  constructor(
    readonly registrationId: string,
    readonly status: string,
  ) {
    super(`Registration ${registrationId} is ${status}: no payment expected`);
    this.name = "PaymentNotExpectedError";
  }
}

/** The registration has no voucher waiting for the organizer (already reviewed, or none). */
export class NothingToReviewError extends Error {
  constructor(readonly registrationId: string) {
    super(`Registration ${registrationId} has no voucher in review`);
    this.name = "NothingToReviewError";
  }
}

export class InvalidRejectionReasonError extends Error {
  constructor() {
    super("A rejection needs a reason of up to 200 characters");
    this.name = "InvalidRejectionReasonError";
  }
}

/** The club has no Mercado Pago account connected: players pay by voucher instead. */
export class MercadoPagoUnavailableError extends Error {
  constructor(readonly clubId: string) {
    super(`Club ${clubId} doesn't take Mercado Pago payments`);
    this.name = "MercadoPagoUnavailableError";
  }
}

/** HU-29: the player can't cancel now. */
export class CancellationNotAllowedError extends Error {
  constructor(readonly reason: "already_cancelled" | "payment_in_review" | "event_started") {
    super(`Registration can't be cancelled: ${reason}`);
    this.name = "CancellationNotAllowedError";
  }
}

/** HU-30: the player's balance in the club doesn't cover the price. */
export class NoBalanceError extends Error {
  constructor() {
    super("Not enough balance in favor for this sign-up");
    this.name = "NoBalanceError";
  }
}

/**
 * HU-27/HU-30: plan credits and balance are spent only by the Google account that signed up,
 * never by whoever knows the link or the phone.
 */
export class AccountRequiredError extends Error {
  constructor() {
    super("Sign in with the registration's Google account to use a plan or balance");
    this.name = "AccountRequiredError";
  }
}

/** HU-31: between 2 and 8 teams, and no more teams than players. */
export class InvalidTeamCountError extends Error {
  constructor(readonly teamCount: number) {
    super(`Invalid number of teams: ${teamCount}`);
    this.name = "InvalidTeamCountError";
  }
}

/** HU-31: not enough women signed up for the mixed-team minimum. */
export class NotEnoughWomenError extends Error {
  constructor(
    readonly needed: number,
    readonly available: number,
  ) {
    super(`Mixed teams need ${needed} women, only ${available} signed up`);
    this.name = "NotEnoughWomenError";
  }
}

/** Only a paid registration can go back to pending payment. */
export class RegistrationNotPaidError extends Error {
  constructor(readonly registrationId: string) {
    super(`Registration ${registrationId} is not paid`);
    this.name = "RegistrationNotPaidError";
  }
}
