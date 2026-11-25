export class EventEndsBeforeStartError extends Error {
  constructor() {
    super("Event must end after it starts");
    this.name = "EventEndsBeforeStartError";
  }
}

export class EventInPastError extends Error {
  constructor(readonly startsAt: Date) {
    super(`Event must start in the future, got ${startsAt.toISOString()}`);
    this.name = "EventInPastError";
  }
}

export class InvalidCapacityError extends Error {
  constructor(readonly capacity: number) {
    super(`Capacity must be a positive integer, got ${capacity}`);
    this.name = "InvalidCapacityError";
  }
}

export class InvalidPriceError extends Error {
  constructor(readonly priceCents: number) {
    super(`Price must be a non-negative integer of cents, got ${priceCents}`);
    this.name = "InvalidPriceError";
  }
}

export class InvalidMapsUrlError extends Error {
  constructor(readonly url: string) {
    super(`Not a Google Maps link: "${url}"`);
    this.name = "InvalidMapsUrlError";
  }
}

export class ClubNotFoundError extends Error {
  constructor(readonly clubSlug: string) {
    super(`Club not found: "${clubSlug}"`);
    this.name = "ClubNotFoundError";
  }
}

export class CommunityNotInClubError extends Error {
  constructor(readonly communityId: string) {
    super(`Community ${communityId} does not belong to the club`);
    this.name = "CommunityNotInClubError";
  }
}

export class EventNotFoundError extends Error {
  constructor(readonly eventId: string) {
    super(`Event not found: ${eventId}`);
    this.name = "EventNotFoundError";
  }
}

export class EventNotEditableError extends Error {
  constructor(readonly status: string) {
    super(`An event in status "${status}" can't be edited`);
    this.name = "EventNotEditableError";
  }
}

export class EventAlreadyCancelledError extends Error {
  constructor() {
    super("Event is already cancelled");
    this.name = "EventAlreadyCancelledError";
  }
}

export class CapacityBelowConfirmedError extends Error {
  constructor(
    readonly capacity: number,
    readonly confirmed: number,
  ) {
    super(`Capacity ${capacity} is below the ${confirmed} confirmed registrations`);
    this.name = "CapacityBelowConfirmedError";
  }
}

/** HU-28: weekday, start time or "publish N days before" out of range. */
export class InvalidRecurrenceError extends Error {
  constructor() {
    super("Invalid weekly schedule");
    this.name = "InvalidRecurrenceError";
  }
}

export class RecurringEventNotFoundError extends Error {
  constructor(readonly recurringEventId: string) {
    super(`Recurring event ${recurringEventId} not found in this club`);
    this.name = "RecurringEventNotFoundError";
  }
}

export class InvalidCourtCostError extends Error {
  constructor(readonly courtCostCents: number) {
    super(`Court cost must be a non-negative integer of cents, got ${courtCostCents}`);
    this.name = "InvalidCourtCostError";
  }
}
