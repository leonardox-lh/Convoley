export class InvalidClubSlugError extends Error {
  constructor(readonly raw: string) {
    super(`Invalid club slug: "${raw}"`);
    this.name = "InvalidClubSlugError";
  }
}

export class ReservedClubSlugError extends Error {
  constructor(readonly slug: string) {
    super(`Club slug "${slug}" is reserved`);
    this.name = "ReservedClubSlugError";
  }
}

export class ClubSlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`Club slug "${slug}" is already taken`);
    this.name = "ClubSlugTakenError";
  }
}

export class ClubNotFoundError extends Error {
  constructor(readonly slug: string) {
    super(`Club "${slug}" not found`);
    this.name = "ClubNotFoundError";
  }
}

export class InvalidColorError extends Error {
  constructor(readonly raw: string) {
    super(`Invalid hex color: "${raw}"`);
    this.name = "InvalidColorError";
  }
}

export class InvalidSocialLinkError extends Error {
  constructor(
    readonly network: string,
    readonly raw: string,
  ) {
    super(`Invalid ${network} link: "${raw}"`);
    this.name = "InvalidSocialLinkError";
  }
}

export class LogoTooLargeError extends Error {
  constructor(readonly sizeBytes: number) {
    super(`Logo is too large: ${sizeBytes} bytes`);
    this.name = "LogoTooLargeError";
  }
}

export class InvalidLogoTypeError extends Error {
  constructor(readonly contentType: string) {
    super(`Logo type not allowed: "${contentType}"`);
    this.name = "InvalidLogoTypeError";
  }
}

export class InvalidCommunityNameError extends Error {
  constructor(readonly raw: string) {
    super(`Invalid community name: "${raw}"`);
    this.name = "InvalidCommunityNameError";
  }
}

export class CommunityNameTakenError extends Error {
  constructor(readonly communityName: string) {
    super(`Community "${communityName}" already exists in this club`);
    this.name = "CommunityNameTakenError";
  }
}

export class CommunityNotFoundError extends Error {
  constructor(readonly communityId: string) {
    super(`Community ${communityId} not found in this club`);
    this.name = "CommunityNotFoundError";
  }
}

/** Events keep their community: one with events can be renamed but not deleted. */
export class CommunityInUseError extends Error {
  constructor(readonly communityId: string) {
    super(`Community ${communityId} has events`);
    this.name = "CommunityInUseError";
  }
}

/** Every event needs a community, so a club always keeps at least one. */
export class LastCommunityError extends Error {
  constructor() {
    super("A club needs at least one community");
    this.name = "LastCommunityError";
  }
}

export class InvalidPaymentPhoneError extends Error {
  constructor(readonly raw: string) {
    super(`Invalid Yape/Plin number: "${raw}"`);
    this.name = "InvalidPaymentPhoneError";
  }
}

export class InvalidPaymentHolderError extends Error {
  constructor() {
    super("The account holder name is required (up to 60 characters)");
    this.name = "InvalidPaymentHolderError";
  }
}

/** HU-22: a fixed fee up to S/ 50 or a percentage up to 20 %. */
export class InvalidServiceFeeError extends Error {
  constructor() {
    super("The service fee must be a positive amount up to S/ 50 or up to 20 %");
    this.name = "InvalidServiceFeeError";
  }
}
