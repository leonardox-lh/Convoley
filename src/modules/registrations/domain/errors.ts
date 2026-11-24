export class InvalidPhoneNumberError extends Error {
  constructor(readonly phone: string) {
    super(`Not a Peruvian mobile number: "${phone}"`);
    this.name = "InvalidPhoneNumberError";
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
