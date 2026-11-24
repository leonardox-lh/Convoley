import { InvalidPasswordError } from "./errors";

export const PASSWORD_MIN_LENGTH = 8;
// Caps the work a single login does when hashing.
export const PASSWORD_MAX_LENGTH = 128;

/** A plain-text password that meets the rules; only exists on its way to the hasher. */
export class Password {
  private constructor(readonly value: string) {}

  static create(value: string): Password {
    if (value.length < PASSWORD_MIN_LENGTH) throw new InvalidPasswordError("too_short");
    if (value.length > PASSWORD_MAX_LENGTH) throw new InvalidPasswordError("too_long");
    return new Password(value);
  }
}
