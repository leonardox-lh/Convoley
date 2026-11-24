const DAY_MS = 24 * 60 * 60 * 1000;
/** Mercado Pago access tokens last 180 days; renew a week early so a payment never meets an expired one. */
export const TOKEN_REFRESH_MARGIN_MS = 7 * DAY_MS;

export function needsRefresh(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() - now.getTime() < TOKEN_REFRESH_MARGIN_MS;
}
