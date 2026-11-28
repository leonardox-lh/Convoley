import { formatSoles } from "@/lib/money";
import { clubLogoPath, getPaymentSettings } from "@/modules/clubs";
import type { PaymentInfo } from "./c/[club]/[event]/payment-instructions";

/** The club's Yape/Plin details for an event price, ready for <PaymentInstructions>. */
export async function loadPaymentInfo(clubSlug: string, priceCents: number): Promise<PaymentInfo> {
  const settings = await getPaymentSettings(clubSlug);
  return {
    priceText: formatSoles(priceCents),
    app: settings?.paymentApp ?? null,
    phone: settings?.paymentPhone?.replace(/^\+51/, "") ?? null,
    holderName: settings?.paymentHolderName ?? null,
    qrUrl: settings?.paymentQrKey ? clubLogoPath(settings.paymentQrKey) : null,
  };
}
