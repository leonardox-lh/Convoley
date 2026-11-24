import { EmailAlreadyRegisteredError } from "../domain/errors";
import type {
  AttemptLimiter,
  EmailSender,
  PasswordHasher,
  PasswordResetToken,
  PasswordResetTokenRepository,
  UserAccount,
  UserAccountRepository,
} from "./ports";

export const fakeHasher: PasswordHasher = {
  hash: async (plain) => `hashed:${plain}`,
  verify: async (plain, hash) => hash === `hashed:${plain}`,
};

export function fakeLimiter(allowed = true) {
  const recorded: string[] = [];
  const cleared: string[] = [];
  const limiter: AttemptLimiter = {
    isBlocked: () => !allowed,
    record: (key) => void recorded.push(key),
    clear: (key) => void cleared.push(key),
  };
  return Object.assign(limiter, { recorded, cleared });
}

export function fakeUsers(initial: UserAccount[] = []) {
  const users = [...initial];
  const repository: UserAccountRepository = {
    findByEmail: async (email) => users.find((u) => u.email === email) ?? null,
    create: async ({ email, passwordHash }) => {
      if (users.some((u) => u.email === email)) throw new EmailAlreadyRegisteredError(email);
      const id = `user-${users.length + 1}`;
      users.push({ id, email, passwordHash });
      return { id };
    },
  };
  return { users, repository };
}

type StoredToken = PasswordResetToken & { tokenHash: string };

export function fakeTokens(options: { consumeResult?: boolean } = {}) {
  const stored: StoredToken[] = [];
  const consumed: { tokenId: string; userId: string; passwordHash: string; at: Date }[] = [];
  const repository: PasswordResetTokenRepository = {
    replaceForUser: async ({ userId, tokenHash, expiresAt }) => {
      for (const t of stored) if (t.userId === userId && !t.usedAt) t.usedAt = new Date(0);
      stored.push({ id: `tok-${stored.length + 1}`, userId, tokenHash, expiresAt, usedAt: null });
    },
    findByHash: async (hash) => stored.find((t) => t.tokenHash === hash) ?? null,
    consume: async (input) => {
      consumed.push(input);
      const token = stored.find((t) => t.id === input.tokenId);
      if (options.consumeResult === false || !token || token.usedAt) return false;
      token.usedAt = input.at;
      return true;
    },
  };
  return { stored, consumed, repository };
}

export function fakeEmailSender() {
  const sent: { to: string; link: string }[] = [];
  const sender: EmailSender = { sendPasswordReset: async (m) => void sent.push(m) };
  return { sent, sender };
}
