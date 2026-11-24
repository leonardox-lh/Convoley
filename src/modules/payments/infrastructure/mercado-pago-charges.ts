import { MercadoPagoChargeError } from "../domain/errors";
import { centsToSolesAmount, solesToCentsExact } from "../domain/mercado-pago-status";
import type { MercadoPagoCharge, MercadoPagoCharges } from "../application/ports";
import { MERCADO_PAGO_API } from "./mercado-pago-api";

interface PaymentResponse {
  id: number | string;
  status: string;
  status_detail?: string | null;
  transaction_amount: number;
  currency_id: string;
  external_reference?: string | null;
}

const toCharge = (body: PaymentResponse): MercadoPagoCharge => ({
  providerPaymentId: String(body.id),
  status: body.status,
  statusDetail: body.status_detail ?? null,
  amountCents: solesToCentsExact(body.transaction_amount),
  currency: body.currency_id,
  externalReference: body.external_reference ?? null,
});

/** Checkout API over plain fetch: every call uses the organizer's token, never Convoley's. */
export function mercadoPagoCharges(fetcher: typeof fetch = fetch): MercadoPagoCharges {
  async function call(path: string, init: RequestInit & { accessToken: string }) {
    const { accessToken, headers, ...rest } = init;
    const response = await fetcher(`${MERCADO_PAGO_API}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...headers,
      },
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new MercadoPagoChargeError(response.status, body);
    return body;
  }

  return {
    async create(accessToken, charge) {
      const body = await call("/v1/payments", {
        method: "POST",
        accessToken,
        headers: { "X-Idempotency-Key": charge.idempotencyKey },
        // No application_fee or marketplace_fee: the whole amount is the organizer's.
        body: JSON.stringify({
          transaction_amount: centsToSolesAmount(charge.amountCents),
          token: charge.token,
          payment_method_id: charge.paymentMethodId,
          installments: charge.installments,
          ...(charge.issuerId && { issuer_id: charge.issuerId }),
          payer: { email: charge.payerEmail },
          description: charge.description,
          external_reference: charge.externalReference,
        }),
      });
      return toCharge(body as PaymentResponse);
    },
    async find(accessToken, providerPaymentId) {
      const body = await call(`/v1/payments/${encodeURIComponent(providerPaymentId)}`, {
        method: "GET",
        accessToken,
      });
      return toCharge(body as PaymentResponse);
    },
    async refund(accessToken, providerPaymentId, idempotencyKey) {
      await call(`/v1/payments/${encodeURIComponent(providerPaymentId)}/refunds`, {
        method: "POST",
        accessToken,
        headers: { "X-Idempotency-Key": idempotencyKey },
        body: JSON.stringify({}),
      });
    },
  };
}
