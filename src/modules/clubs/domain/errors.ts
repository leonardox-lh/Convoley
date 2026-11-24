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
