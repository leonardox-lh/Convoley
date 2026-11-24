import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { MP_WEBHOOK_SECRET: "" } }));
const { verifyWebhookSignature } = await import("./webhook-signature");

const SECRET = "test-webhook-secret";

function sign(dataId: string, requestId: string, ts = "1732492800") {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${createHmac("sha256", SECRET).update(manifest).digest("hex")}`;
}

describe("HU-20: solo se aceptan notificaciones firmadas por Mercado Pago", () => {
  it("acepta una firma válida", () => {
    const signature = sign("123456", "req-1");
    expect(
      verifyWebhookSignature({ signature, requestId: "req-1", dataId: "123456" }, SECRET),
    ).toBe(true);
  });

  it("rechaza una firma alterada, de otra solicitud o sin cabeceras", () => {
    const signature = sign("123456", "req-1");
    const tampered = signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0");
    expect(
      verifyWebhookSignature({ signature: tampered, requestId: "req-1", dataId: "123456" }, SECRET),
    ).toBe(false);
    expect(
      verifyWebhookSignature({ signature, requestId: "req-2", dataId: "123456" }, SECRET),
    ).toBe(false);
    expect(verifyWebhookSignature({ signature, requestId: "req-1", dataId: "999" }, SECRET)).toBe(
      false,
    );
    expect(
      verifyWebhookSignature({ signature: null, requestId: "req-1", dataId: "123456" }, SECRET),
    ).toBe(false);
    expect(verifyWebhookSignature({ signature, requestId: null, dataId: "123456" }, SECRET)).toBe(
      false,
    );
  });

  it("sin secreto configurado no acepta nada", () => {
    const signature = sign("123456", "req-1");
    expect(verifyWebhookSignature({ signature, requestId: "req-1", dataId: "123456" })).toBe(false);
  });
});
