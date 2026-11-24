import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Long enough to look at the list and open a few screenshots; short if a link leaks. */
export const VOUCHER_URL_TTL_MS = 10 * 60 * 1000;
// The organizer's list refreshes every few seconds: within this window the URL stays the same,
// so the browser doesn't download the image again on every refresh.
const STABLE_WINDOW_MS = 5 * 60 * 1000;

const signature = (key: string, expiresAt: number, secret: string) =>
  createHmac("sha256", secret).update(`voucher:${key}:${expiresAt}`).digest("base64url");

/**
 * A short-lived signed path to a private voucher image (served by src/app/vouchers/[key]).
 * Only organizer pages build these; the bucket itself stays private.
 */
export function signVoucherPath(key: string, now = Date.now(), secret = env.AUTH_SECRET): string {
  const expiresAt = now - (now % STABLE_WINDOW_MS) + VOUCHER_URL_TTL_MS;
  const query = new URLSearchParams({
    exp: String(expiresAt),
    sig: signature(key, expiresAt, secret),
  });
  return `/vouchers/${encodeURIComponent(key)}?${query}`;
}

/** True only for an unexpired path signed by signVoucherPath with the same secret. */
export function verifyVoucherSignature(
  input: { key: string; exp: string | null; sig: string | null },
  now = Date.now(),
  secret = env.AUTH_SECRET,
): boolean {
  const expiresAt = Number(input.exp);
  if (!input.sig || !Number.isSafeInteger(expiresAt) || expiresAt < now) return false;
  const expected = Buffer.from(signature(input.key, expiresAt, secret));
  const given = Buffer.from(input.sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
