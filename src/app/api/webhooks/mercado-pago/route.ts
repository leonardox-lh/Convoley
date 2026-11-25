import { z } from "zod";
import { findMercadoPagoPaymentOwner, verifyWebhookSignature } from "@/modules/payments";
import { settlePlanPurchaseNotification } from "@/modules/plans";
import { settleMercadoPagoNotification } from "@/modules/registrations";
import { settleOrderNotification } from "@/modules/store";

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

  await settle({ providerPaymentId: data.id, mpUserId: mpUserId ?? null });
  return new Response(null, { status: 200 });
}

type Notification = { providerPaymentId: string; mpUserId: string | null };

/**
 * Sends the notification to the module that owns the payment: registrations, the store (HU-24)
 * or plans (HU-27). A payment we haven't linked yet is unknown here: each module looks it up by its
 * external_reference and answers "unknown_payment" when it isn't theirs.
 */
async function settle(notification: Notification) {
  const owner = await findMercadoPagoPaymentOwner(notification.providerPaymentId);
  if (owner === "order") return settleOrderNotification(notification);
  if (owner === "plan_purchase") return settlePlanPurchaseNotification(notification);
  if (owner === "registration") return settleMercadoPagoNotification(notification);
  for (const tryModule of [
    settleMercadoPagoNotification,
    settleOrderNotification,
    settlePlanPurchaseNotification,
  ]) {
    if ((await tryModule(notification)) !== "unknown_payment") return;
  }
}
