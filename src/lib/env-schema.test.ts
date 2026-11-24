import { describe, expect, it } from "vitest";
import { parseEnv } from "./env-schema";

const BASE = {
  DATABASE_URL: "postgresql://user:pass@localhost:5433/convoley",
  AUTH_SECRET: "x".repeat(32),
};

const PRODUCTION = {
  ...BASE,
  NODE_ENV: "production",
  APP_URL: "https://convoley.example",
  AUTH_GOOGLE_ID: "google-id",
  AUTH_GOOGLE_SECRET: "google-secret",
  RESEND_API_KEY: "re_key",
  EMAIL_FROM: "Convoley <hola@convoley.example>",
  BUCKET_NAME: "bucket",
  BUCKET_ENDPOINT: "https://bucket.example",
  BUCKET_ACCESS_KEY_ID: "key",
  BUCKET_SECRET_ACCESS_KEY: "secret",
};

const MERCADO_PAGO = {
  MP_CLIENT_ID: "123",
  MP_CLIENT_SECRET: "client-secret",
  MP_WEBHOOK_SECRET: "webhook-secret",
  MP_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
};

describe("HT-05: credenciales de Mercado Pago en variables de entorno", () => {
  it("HT-05 criterio 1: en desarrollo la app arranca sin credenciales de Mercado Pago", () => {
    expect(() => parseEnv(BASE)).not.toThrow();
  });

  it("HT-05 criterio 1: en producción exige las cuatro variables MP_*", () => {
    expect(() => parseEnv(PRODUCTION)).toThrow(/MP_CLIENT_ID/);
    expect(parseEnv({ ...PRODUCTION, ...MERCADO_PAGO }).MP_CLIENT_ID).toBe("123");
  });

  it("HT-05 criterio 1: la clave de cifrado debe tener 32 bytes en base64", () => {
    const shortKey = Buffer.alloc(16).toString("base64");
    expect(() => parseEnv({ ...BASE, MP_TOKEN_ENCRYPTION_KEY: shortKey })).toThrow(/32 bytes/);
  });
});
