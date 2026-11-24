import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Checks Mercado Pago's `x-signature` header (HU-20): `ts=<unix>,v1=<hex HMAC-SHA256>` over the
 * manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` with the webhook secret.
 * Without a valid signature the notification is ignored: anyone can POST to the URL.
 */
export function verifyWebhookSignature(
  input: { signature: string | null; requestId: string | null; dataId: string },
  secret = env.MP_WEBHOOK_SECRET,
): boolean {
  if (!secret || !input.signature || !input.requestId) return false;
  const parts = Object.fromEntries(
    input.signature.split(",").map((part) => part.trim().split("=", 2) as [string, string]),
  );
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;
  // Mercado Pago signs alphanumeric ids in lowercase.
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${ts};`;
  const expected = Buffer.from(createHmac("sha256", secret).update(manifest).digest("hex"));
  const given = Buffer.from(v1);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
