export class InvalidPasswordError extends Error {
  constructor(readonly reason: "too_short" | "too_long") {
    super(`Invalid password: ${reason}`);
    this.name = "InvalidPasswordError";
  }
}

/** Wrong email or password. Deliberately does not say which one. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor(readonly email: string) {
    super(`Email already registered: ${email}`);
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class TooManyAttemptsError extends Error {
  constructor() {
    super("Too many attempts, try again later");
    this.name = "TooManyAttemptsError";
  }
}

/** The reset link does not exist or was already used. */
export class ResetTokenInvalidError extends Error {
  constructor() {
    super("Password reset token is invalid or already used");
    this.name = "ResetTokenInvalidError";
  }
}

export class ResetTokenExpiredError extends Error {
  constructor(readonly expiresAt: Date) {
    super(`Password reset token expired at ${expiresAt.toISOString()}`);
    this.name = "ResetTokenExpiredError";
  }
}
