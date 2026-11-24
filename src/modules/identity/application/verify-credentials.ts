import { normalizeEmail } from "../domain/email";
import { InvalidCredentialsError, TooManyAttemptsError } from "../domain/errors";
import type { AttemptLimiter, PasswordHasher, UserAccountRepository } from "./ports";

export function makeVerifyCredentials(deps: {
  users: UserAccountRepository;
  hasher: PasswordHasher;
  limiter: AttemptLimiter;
}) {
  return async function verifyCredentials(input: {
    email: string;
    password: string;
  }): Promise<{ id: string; email: string }> {
    const email = normalizeEmail(input.email);
    const limiterKey = `login:${email}`;
    if (deps.limiter.isBlocked(limiterKey)) throw new TooManyAttemptsError();

    const user = await deps.users.findByEmail(email);
    // Google-only accounts have no password: same error, so the form doesn't reveal which accounts exist.
    const valid =
      user?.passwordHash && (await deps.hasher.verify(input.password, user.passwordHash));
    // Only failures count, so signing in from several devices never locks the organizer out.
    if (!user || !valid) {
      deps.limiter.record(limiterKey);
      throw new InvalidCredentialsError();
    }
    deps.limiter.clear(limiterKey);
    return { id: user.id, email: user.email };
  };
}
