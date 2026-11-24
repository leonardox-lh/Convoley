import { describe, expect, it } from "vitest";
import { InvalidCredentialsError, TooManyAttemptsError } from "../domain/errors";
import { fakeHasher, fakeLimiter, fakeUsers } from "./fakes";
import { makeVerifyCredentials } from "./verify-credentials";

function setup(limiterAllows = true) {
  const { repository } = fakeUsers([
    { id: "u1", email: "ana@mail.com", passwordHash: "hashed:clave-segura-1" },
    { id: "u2", email: "google@mail.com", passwordHash: null },
  ]);
  return makeVerifyCredentials({
    users: repository,
    hasher: fakeHasher,
    limiter: fakeLimiter(limiterAllows),
  });
}

describe("verifyCredentials", () => {
  it("HU-01: inicia sesión con correo y contraseña correctos, ignorando mayúsculas y espacios", async () => {
    const result = await setup()({ email: "  ANA@Mail.com ", password: "clave-segura-1" });
    expect(result).toEqual({ id: "u1", email: "ana@mail.com" });
  });

  it("HU-01: contraseña errada falla con InvalidCredentialsError", async () => {
    await expect(
      setup()({ email: "ana@mail.com", password: "otra-clave-123" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("HU-01: usuario sin passwordHash (solo Google) falla con InvalidCredentialsError", async () => {
    await expect(
      setup()({ email: "google@mail.com", password: "lo-que-sea-123" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("HU-01: correo inexistente falla con InvalidCredentialsError", async () => {
    await expect(
      setup()({ email: "nadie@mail.com", password: "clave-segura-1" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("HU-01: con el limiter bloqueado falla con TooManyAttemptsError aunque la clave sea correcta", async () => {
    await expect(
      setup(false)({ email: "ana@mail.com", password: "clave-segura-1" }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError);
  });

  it("HU-01: solo cuenta los intentos fallidos y limpia el contador al entrar", async () => {
    const { repository } = fakeUsers([
      { id: "u1", email: "ana@mail.com", passwordHash: "hashed:clave-segura-1" },
    ]);
    const limiter = fakeLimiter();
    const verify = makeVerifyCredentials({ users: repository, hasher: fakeHasher, limiter });

    await expect(
      verify({ email: "ana@mail.com", password: "otra-clave-1" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    await verify({ email: "ana@mail.com", password: "clave-segura-1" });

    expect(limiter.recorded).toEqual(["login:ana@mail.com"]);
    expect(limiter.cleared).toEqual(["login:ana@mail.com"]);
  });
});
