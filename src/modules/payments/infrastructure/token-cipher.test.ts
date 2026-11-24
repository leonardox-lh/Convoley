import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./token-cipher";

const KEY = Buffer.alloc(32, 1).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 2).toString("base64");

describe("HU-18: los tokens de Mercado Pago se guardan cifrados", () => {
  it("HU-18 criterio 1: el valor guardado no contiene el token y se recupera con la clave", () => {
    const stored = encryptToken("APP_USR-secret-token", KEY);
    expect(stored).not.toContain("APP_USR-secret-token");
    expect(decryptToken(stored, KEY)).toBe("APP_USR-secret-token");
  });

  it("HU-18 criterio 1: cifrar dos veces da valores distintos (IV aleatorio)", () => {
    expect(encryptToken("same", KEY)).not.toBe(encryptToken("same", KEY));
  });

  it("HU-18 criterio 1: con otra clave o alterado no se puede leer", () => {
    const stored = encryptToken("APP_USR-secret-token", KEY);
    expect(() => decryptToken(stored, OTHER_KEY)).toThrow();
    const [iv, tag, data] = stored.split(".");
    const tampered = `${data!.startsWith("A") ? "B" : "A"}${data!.slice(1)}`;
    expect(() => decryptToken([iv, tag, tampered].join("."), KEY)).toThrow();
  });
});
