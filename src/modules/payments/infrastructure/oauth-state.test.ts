import { describe, expect, it, vi } from "vitest";

// env.ts requires real variables; the secret is passed explicitly below.
vi.mock("@/lib/env", () => ({ env: { AUTH_SECRET: "unused" } }));

const { OAUTH_STATE_TTL_MS, signOAuthState, verifyOAuthState } = await import("./oauth-state");

const SECRET = "s".repeat(32);
const NOW = 1_800_000_000_000;
const state = { clubSlug: "voley-miraflores", userId: "user-1" };

describe("HU-18: el state de OAuth ata la conexión al club y al admin que la inició", () => {
  it("HU-18 criterio 1: un state válido devuelve el club y el usuario", () => {
    const signed = signOAuthState(state, NOW, SECRET);
    expect(verifyOAuthState(signed, NOW + 1000, SECRET)).toEqual(state);
  });

  it("HU-18 criterio 1: rechaza un state vencido", () => {
    const signed = signOAuthState(state, NOW, SECRET);
    expect(verifyOAuthState(signed, NOW + OAUTH_STATE_TTL_MS + 1, SECRET)).toBeNull();
  });

  it("HU-18 criterio 1: rechaza un state alterado para otro club o firmado con otra clave", () => {
    const signed = signOAuthState(state, NOW, SECRET);
    const [, signature] = signed.split(".");
    const forged = Buffer.from(
      JSON.stringify({ clubSlug: "otro-club", userId: "user-1", exp: NOW + 1000 }),
    ).toString("base64url");
    expect(verifyOAuthState(`${forged}.${signature}`, NOW, SECRET)).toBeNull();
    expect(verifyOAuthState(signed, NOW, "o".repeat(32))).toBeNull();
    expect(verifyOAuthState(null, NOW, SECRET)).toBeNull();
  });
});
