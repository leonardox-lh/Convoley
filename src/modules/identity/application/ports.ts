export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface EmailSender {
  sendPasswordReset(input: { to: string; link: string }): Promise<void>;
}

/** Counts attempts per key (e.g. an email) inside a time window. */
export interface AttemptLimiter {
  /** True when the key already used up its attempts in the current window. */
  isBlocked(key: string): boolean;
  record(key: string): void;
  clear(key: string): void;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string | null;
}

export interface UserAccountRepository {
  findByEmail(email: string): Promise<UserAccount | null>;
  /** Throws EmailAlreadyRegisteredError if the email is taken. */
  create(input: { email: string; name: string; passwordHash: string }): Promise<{ id: string }>;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface PasswordResetTokenRepository {
  /** Stores a new token for the user and invalidates the user's earlier unused ones. */
  replaceForUser(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findByHash(tokenHash: string): Promise<PasswordResetToken | null>;
  /**
   * Atomically marks the token used (only if still unused) and sets the new password.
   * Returns false when another request used it first.
   */
  consume(input: {
    tokenId: string;
    userId: string;
    passwordHash: string;
    at: Date;
  }): Promise<boolean>;
}

/** What a player's account knows to autocomplete a registration (HU-48). */
export interface PlayerProfile {
  firstName: string;
  lastName: string;
  /** Normalized +519XXXXXXXX; null until the first registration asks for it. */
  phone: string | null;
}

export interface PlayerProfileRepository {
  find(userId: string): Promise<PlayerProfile | null>;
  /** Throws PhoneLinkedToAnotherAccountError if another account already has the phone. */
  setPhone(userId: string, phone: string): Promise<void>;
  /** Throws PhoneLinkedToAnotherAccountError if another account already has the phone. */
  update(userId: string, profile: PlayerProfile): Promise<void>;
}
