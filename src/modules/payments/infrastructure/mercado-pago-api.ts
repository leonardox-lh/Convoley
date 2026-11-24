import { env } from "@/lib/env";
import { MercadoPagoAuthorizationError } from "../domain/errors";
import type { MercadoPagoOAuth, MercadoPagoTokens } from "../application/ports";

export const MERCADO_PAGO_API = "https://api.mercadopago.com";
const AUTHORIZATION_URL = "https://auth.mercadopago.com/authorization";
const SECOND_MS = 1000;

/** True when this deployment has a Mercado Pago app configured (HT-05). */
export function isMercadoPagoConfigured(): boolean {
  return Boolean(env.MP_CLIENT_ID && env.MP_CLIENT_SECRET && env.MP_TOKEN_ENCRYPTION_KEY);
}

/** Mercado Pago's consent page; it sends the organizer back to redirectUri with ?code&state. */
export function mercadoPagoAuthorizationUrl(input: { state: string; redirectUri: string }) {
  const query = new URLSearchParams({
    client_id: env.MP_CLIENT_ID ?? "",
    response_type: "code",
    platform_id: "mp",
    state: input.state,
    redirect_uri: input.redirectUri,
  });
  return `${AUTHORIZATION_URL}?${query}`;
}

interface OAuthResponse {
  access_token: string;
  refresh_token: string;
  public_key: string;
  user_id: number | string;
  expires_in: number;
  live_mode: boolean;
}

function toTokens(body: OAuthResponse, now: number): MercadoPagoTokens {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    publicKey: body.public_key,
    mpUserId: String(body.user_id),
    expiresAt: new Date(now + body.expires_in * SECOND_MS),
    liveMode: body.live_mode,
  };
}

async function requestToken(grant: Record<string, string>, fetcher: typeof fetch) {
  const response = await fetcher(`${MERCADO_PAGO_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.MP_CLIENT_ID,
      client_secret: env.MP_CLIENT_SECRET,
      ...grant,
    }),
  });
  if (!response.ok) {
    throw new MercadoPagoAuthorizationError(`${response.status} ${await response.text()}`);
  }
  return toTokens((await response.json()) as OAuthResponse, Date.now());
}

export function mercadoPagoOAuth(fetcher: typeof fetch = fetch): MercadoPagoOAuth {
  return {
    exchangeCode: ({ code, redirectUri }) =>
      requestToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri }, fetcher),
    refresh: (refreshToken) =>
      requestToken({ grant_type: "refresh_token", refresh_token: refreshToken }, fetcher),
  };
}
