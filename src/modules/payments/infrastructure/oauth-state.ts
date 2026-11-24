import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Time to log in to Mercado Pago and accept; short so a leaked link is useless. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthState {
  clubSlug: string;
  userId: string;
}

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(`mp-oauth:${payload}`).digest("base64url");

/**
 * The OAuth `state`: ties Mercado Pago's callback to the organizer and club that started it,
 * so nobody can make Convoley store their account under someone else's club (CSRF).
 */
export function signOAuthState(
  state: OAuthState,
  now = Date.now(),
  secret = env.AUTH_SECRET,
): string {
  const payload = Buffer.from(JSON.stringify({ ...state, exp: now + OAUTH_STATE_TTL_MS })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload, secret)}`;
}

/** The club and user of an unexpired, untouched state; null otherwise. */
export function verifyOAuthState(
  value: string | null,
  now = Date.now(),
  secret = env.AUTH_SECRET,
): OAuthState | null {
  const [payload, signature] = (value ?? "").split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!isState(data) || data.exp < now) return null;
  return { clubSlug: data.clubSlug, userId: data.userId };
}

function isState(data: unknown): data is OAuthState & { exp: number } {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return (
    typeof record.clubSlug === "string" &&
    typeof record.userId === "string" &&
    typeof record.exp === "number"
  );
}
