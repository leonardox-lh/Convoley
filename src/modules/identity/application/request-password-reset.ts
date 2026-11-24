import { normalizeEmail } from "../domain/email";
import type {
  AttemptLimiter,
  EmailSender,
  PasswordResetTokenRepository,
  UserAccountRepository,
} from "./ports";
import { generateResetToken, hashResetToken } from "./reset-token";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Emails a reset link. Resolves the same way whether or not the email exists,
 * so the form can't be used to find out who has an account.
 */
export function makeRequestPasswordReset(deps: {
  users: UserAccountRepository;
  tokens: PasswordResetTokenRepository;
  email: EmailSender;
  limiter: AttemptLimiter;
  now: () => Date;
}) {
  return async function requestPasswordReset(input: {
    email: string;
    /** Builds the absolute link for a token, e.g. https://…/recuperar/<token>. */
    linkFor: (token: string) => string;
  }): Promise<void> {
    const email = normalizeEmail(input.email);
    const limiterKey = `reset:${email}`;
    // Every request counts: limits how many emails anyone can make us send to one address.
    if (deps.limiter.isBlocked(limiterKey)) return;
    deps.limiter.record(limiterKey);

    const user = await deps.users.findByEmail(email);
    if (!user) return;

    const token = generateResetToken();
    await deps.tokens.replaceForUser({
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(deps.now().getTime() + RESET_TOKEN_TTL_MS),
    });
    await deps.email.sendPasswordReset({ to: user.email, link: input.linkFor(token) });
  };
}
