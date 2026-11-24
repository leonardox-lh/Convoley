import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { MP_CLIENT_ID: "" } }));
const { mercadoPagoCharges } = await import("./mercado-pago-charges");

const approved = {
  id: 987,
  status: "approved",
  status_detail: "accredited",
  transaction_amount: 15,
  currency_id: "PEN",
  external_reference: "pay-1",
};

function recordingFetch() {
  const requests: { url: string; init: RequestInit }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return new Response(JSON.stringify(approved), { status: 201 });
  }) as unknown as typeof fetch;
  return { fetcher, requests };
}

describe("HU-18/HU-19: el cobro va directo a la cuenta del organizador", () => {
  it("usa el token del organizador, sin comisión de Convoley y con clave de idempotencia", async () => {
    const { fetcher, requests } = recordingFetch();

    const charge = await mercadoPagoCharges(fetcher).create("organizer-token", {
      amountCents: 1500,
      token: "card-token",
      paymentMethodId: "visa",
      installments: 1,
      issuerId: null,
      payerEmail: "ana@example.com",
      description: "Inscripción en Convoley",
      externalReference: "pay-1",
      idempotencyKey: "pay-1",
    });

    const { init } = requests[0]!;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer organizer-token");
    expect(headers["X-Idempotency-Key"]).toBe("pay-1");
    const body = JSON.parse(String(init.body));
    expect(body.transaction_amount).toBe(15);
    expect(body).not.toHaveProperty("application_fee");
    expect(body).not.toHaveProperty("marketplace_fee");
    expect(charge).toMatchObject({ providerPaymentId: "987", amountCents: 1500, currency: "PEN" });
  });
});
