import { z } from "zod";
import { verifyWebhookSignature } from "@/modules/payments";
import { settleMercadoPagoNotification } from "@/modules/registrations";

const notificationSchema = z.object({
  type: z.string(),
  data: z.object({ id: z.union([z.string(), z.number()]).transform(String) }),
  user_id: z.union([z.string(), z.number()]).transform(String).optional(),
});

/**
 * HU-20: Mercado Pago tells us a payment changed. Only the id is used: the payment itself is
 * read back from Mercado Pago. 2xx = handled; 5xx makes Mercado Pago retry later.
 */
export async function POST(request: Request) {
  const parsed = notificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { type, data, user_id: mpUserId } = parsed.data;

  const signed = verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId: data.id,
  });
  if (!signed) return new Response("Invalid signature", { status: 401 });
  // Other topics (merchant orders, chargebacks) aren't used yet.
  if (type !== "payment") return new Response(null, { status: 200 });

  await settleMercadoPagoNotification({ providerPaymentId: data.id, mpUserId: mpUserId ?? null });
  return new Response(null, { status: 200 });
}
