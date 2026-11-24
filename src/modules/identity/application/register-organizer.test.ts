import { describe, expect, it } from "vitest";
import { EmailAlreadyRegisteredError, InvalidPasswordError } from "../domain/errors";
import { fakeHasher, fakeUsers } from "./fakes";
import { makeRegisterOrganizer } from "./register-organizer";

function setup() {
  const { users, repository } = fakeUsers();
  return {
    users,
    registerOrganizer: makeRegisterOrganizer({ users: repository, hasher: fakeHasher }),
  };
}

describe("registerOrganizer", () => {
  it("HU-01: normaliza el correo y guarda el hash, no la contraseña", async () => {
    const { users, registerOrganizer } = setup();
    await registerOrganizer({
      name: "  Ana ",
      email: "  Ana@Mail.COM ",
      password: "clave-segura-1",
    });
    expect(users).toHaveLength(1);
    expect(users[0]!.email).toBe("ana@mail.com");
    expect(users[0]!.passwordHash).toBe("hashed:clave-segura-1");
    expect(users[0]!.passwordHash).not.toBe("clave-segura-1");
  });

  it("HU-01: un correo repetido (otra capitalización) falla con EmailAlreadyRegisteredError", async () => {
    const { users, registerOrganizer } = setup();
    await registerOrganizer({ name: "Ana", email: "ana@mail.com", password: "clave-segura-1" });
    await expect(
      registerOrganizer({ name: "Otra", email: "ANA@mail.com", password: "clave-segura-1" }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    expect(users).toHaveLength(1);
  });

  it("HU-01: una contraseña corta falla con InvalidPasswordError y no crea el usuario", async () => {
    const { users, registerOrganizer } = setup();
    await expect(
      registerOrganizer({ name: "Ana", email: "ana@mail.com", password: "corta" }),
    ).rejects.toBeInstanceOf(InvalidPasswordError);
    expect(users).toHaveLength(0);
  });
});
