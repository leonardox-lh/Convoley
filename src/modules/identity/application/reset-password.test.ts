import { describe, expect, it } from "vitest";
import {
  InvalidPasswordError,
  ResetTokenExpiredError,
  ResetTokenInvalidError,
} from "../domain/errors";
import { fakeHasher, fakeTokens } from "./fakes";
import { makeResetPassword } from "./reset-password";
import { hashResetToken } from "./reset-token";

const NOW = new Date("2026-12-01T12:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const TOKEN = "token-de-prueba";
const NEW_PASSWORD = "nueva-clave-123";

async function setup(
  options: { expiresInMs?: number; used?: boolean; consumeResult?: boolean } = {},
) {
  const tokens = fakeTokens({ consumeResult: options.consumeResult });
  await tokens.repository.replaceForUser({
    userId: "u1",
    tokenHash: hashResetToken(TOKEN),
    expiresAt: new Date(NOW.getTime() + (options.expiresInMs ?? HOUR_MS)),
  });
  if (options.used) tokens.stored[0]!.usedAt = new Date(NOW.getTime() - 1000);
  const resetPassword = makeResetPassword({
    tokens: tokens.repository,
    hasher: fakeHasher,
    now: () => NOW,
  });
  return { resetPassword, tokens };
}

describe("resetPassword", () => {
  it("HU-01: con un token válido cambia el hash y consume el token", async () => {
    const { resetPassword, tokens } = await setup();
    await resetPassword({ token: TOKEN, password: NEW_PASSWORD });
    expect(tokens.consumed).toEqual([
      { tokenId: "tok-1", userId: "u1", passwordHash: `hashed:${NEW_PASSWORD}`, at: NOW },
    ]);
    expect(tokens.stored[0]!.usedAt).toEqual(NOW);
  });

  it("HU-01: un token inexistente falla con ResetTokenInvalidError", async () => {
    const { resetPassword } = await setup();
    await expect(resetPassword({ token: "otro", password: NEW_PASSWORD })).rejects.toBeInstanceOf(
      ResetTokenInvalidError,
    );
  });

  it("HU-01: un token ya usado falla con ResetTokenInvalidError", async () => {
    const { resetPassword, tokens } = await setup({ used: true });
    await expect(resetPassword({ token: TOKEN, password: NEW_PASSWORD })).rejects.toBeInstanceOf(
      ResetTokenInvalidError,
    );
    expect(tokens.consumed).toHaveLength(0);
  });

  it("HU-01: un token vencido falla con ResetTokenExpiredError", async () => {
    const { resetPassword, tokens } = await setup({ expiresInMs: -1 });
    await expect(resetPassword({ token: TOKEN, password: NEW_PASSWORD })).rejects.toBeInstanceOf(
      ResetTokenExpiredError,
    );
    expect(tokens.consumed).toHaveLength(0);
  });

  it("HU-01: si otra petición lo consumió primero (consume=false) falla con ResetTokenInvalidError", async () => {
    const { resetPassword } = await setup({ consumeResult: false });
    await expect(resetPassword({ token: TOKEN, password: NEW_PASSWORD })).rejects.toBeInstanceOf(
      ResetTokenInvalidError,
    );
  });

  it("HU-01: una contraseña corta falla con InvalidPasswordError sin consumir el token", async () => {
    const { resetPassword, tokens } = await setup();
    await expect(resetPassword({ token: TOKEN, password: "corta" })).rejects.toBeInstanceOf(
      InvalidPasswordError,
    );
    expect(tokens.consumed).toHaveLength(0);
  });
});
