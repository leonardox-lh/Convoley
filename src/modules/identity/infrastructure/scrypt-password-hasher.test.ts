import { describe, expect, it } from "vitest";
import { scryptPasswordHasher } from "./scrypt-password-hasher";

describe("scryptPasswordHasher", () => {
  it("HU-01: verify acepta la contraseña correcta y rechaza una errada", async () => {
    const hash = await scryptPasswordHasher.hash("clave-segura-1");
    expect(hash).not.toContain("clave-segura-1");
    expect(await scryptPasswordHasher.verify("clave-segura-1", hash)).toBe(true);
    expect(await scryptPasswordHasher.verify("clave-segura-2", hash)).toBe(false);
  });

  it("HU-01: la misma contraseña produce un hash distinto cada vez (sal aleatoria)", async () => {
    const [a, b] = await Promise.all([
      scryptPasswordHasher.hash("clave-segura-1"),
      scryptPasswordHasher.hash("clave-segura-1"),
    ]);
    expect(a).not.toBe(b);
  });

  it("HU-01: un hash con formato inválido devuelve false", async () => {
    expect(await scryptPasswordHasher.verify("x", "")).toBe(false);
    expect(await scryptPasswordHasher.verify("x", "bcrypt$abc$def")).toBe(false);
    expect(await scryptPasswordHasher.verify("x", "scrypt$1$2")).toBe(false);
  });
});
