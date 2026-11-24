import { describe, expect, it } from "vitest";
import { fakeEmailSender, fakeLimiter, fakeTokens, fakeUsers } from "./fakes";
import { makeRequestPasswordReset, RESET_TOKEN_TTL_MS } from "./request-password-reset";
import { hashResetToken } from "./reset-token";

const NOW = new Date("2026-12-01T12:00:00.000Z");
const LINK_PREFIX = "https://convoley.test/recuperar/";
const linkFor = (token: string) => `${LINK_PREFIX}${token}`;

function setup(limiterAllows = true) {
  const { repository: users } = fakeUsers([
    { id: "u1", email: "ana@mail.com", passwordHash: "hashed:x" },
  ]);
  const tokens = fakeTokens();
  const email = fakeEmailSender();
  const requestPasswordReset = makeRequestPasswordReset({
    users,
    tokens: tokens.repository,
    email: email.sender,
    limiter: fakeLimiter(limiterAllows),
    now: () => NOW,
  });
  return { requestPasswordReset, tokens, email };
}

describe("requestPasswordReset", () => {
  it("HU-01: un correo inexistente no envía nada y no falla", async () => {
    const { requestPasswordReset, tokens, email } = setup();
    await expect(
      requestPasswordReset({ email: "nadie@mail.com", linkFor }),
    ).resolves.toBeUndefined();
    expect(email.sent).toHaveLength(0);
    expect(tokens.stored).toHaveLength(0);
  });

  it("HU-01: guarda solo el hash sha256 del token, vence en 1 hora y el link lleva el token", async () => {
    const { requestPasswordReset, tokens, email } = setup();
    await requestPasswordReset({ email: " ANA@mail.com ", linkFor });

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]!.to).toBe("ana@mail.com");
    const token = email.sent[0]!.link.slice(LINK_PREFIX.length);
    expect(token.length).toBeGreaterThan(20);
    expect(tokens.stored).toHaveLength(1);
    expect(tokens.stored[0]!.tokenHash).toBe(hashResetToken(token));
    expect(tokens.stored[0]!.tokenHash).not.toBe(token);
    expect(tokens.stored[0]!.expiresAt.getTime()).toBe(NOW.getTime() + RESET_TOKEN_TTL_MS);
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });

  it("HU-01: con el limiter bloqueado no envía ni guarda nada", async () => {
    const { requestPasswordReset, tokens, email } = setup(false);
    await requestPasswordReset({ email: "ana@mail.com", linkFor });
    expect(email.sent).toHaveLength(0);
    expect(tokens.stored).toHaveLength(0);
  });
});
