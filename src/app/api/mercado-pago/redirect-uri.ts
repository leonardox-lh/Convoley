import { appUrl } from "@/lib/app-url";

/** Must match the redirect URL registered in the Mercado Pago app (docs/sprints/sprint-3.md). */
export async function mercadoPagoRedirectUri() {
  return `${await appUrl()}/api/mercado-pago/callback`;
}

export const paymentsPagePath = (clubSlug: string, result: "conectado" | "error") =>
  `/admin/${encodeURIComponent(clubSlug)}/pagos?mp=${result}`;
