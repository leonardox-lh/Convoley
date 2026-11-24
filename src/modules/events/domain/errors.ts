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
