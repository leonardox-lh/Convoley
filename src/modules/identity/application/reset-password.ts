import { ResetTokenExpiredError, ResetTokenInvalidError } from "../domain/errors";
import { Password } from "../domain/password";
import type { PasswordHasher, PasswordResetTokenRepository } from "./ports";
import { hashResetToken } from "./reset-token";

export function makeResetPassword(deps: {
  tokens: PasswordResetTokenRepository;
  hasher: PasswordHasher;
  now: () => Date;
}) {
  // shortcut: sessions are JWTs, so devices already signed in stay signed in after a reset;
  // store a session version on User and check it in the jwt callback if that becomes a need.
  return async function resetPassword(input: { token: string; password: string }): Promise<void> {
    const password = Password.create(input.password);
    const now = deps.now();
    const token = await deps.tokens.findByHash(hashResetToken(input.token));
    if (!token || token.usedAt) throw new ResetTokenInvalidError();
    if (token.expiresAt <= now) throw new ResetTokenExpiredError(token.expiresAt);

    const passwordHash = await deps.hasher.hash(password.value);
    const consumed = await deps.tokens.consume({
      tokenId: token.id,
      userId: token.userId,
      passwordHash,
      at: now,
    });
    if (!consumed) throw new ResetTokenInvalidError();
  };
}
