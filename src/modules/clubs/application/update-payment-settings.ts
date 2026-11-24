import { ClubNotFoundError } from "../domain/errors";
import type { LogoUpload } from "../domain/logo";
import { validatePaymentSettings, type PaymentSettings } from "../domain/payment-settings";
import type { LogoStorage, PaymentSettingsRepository } from "./ports";
import { uploadLogo } from "./upload-logo";

export interface UpdatePaymentSettingsInput extends PaymentSettings {
  clubSlug: string;
  /** A new QR image, or null to keep the current one. */
  qr: LogoUpload | null;
}

/**
 * Saves the Yape/Plin number, holder and QR. The QR is public like the logo (players scan it),
 * so it goes to the same storage with the same size and format limits.
 */
export function makeUpdatePaymentSettings(deps: {
  settings: PaymentSettingsRepository;
  images: LogoStorage;
}) {
  return async function updatePaymentSettings(input: UpdatePaymentSettingsInput) {
    const details = validatePaymentSettings(input);
    if (!(await deps.settings.find(input.clubSlug))) throw new ClubNotFoundError(input.clubSlug);
    const paymentQrKey = input.qr
      ? await uploadLogo(deps.images, `${input.clubSlug}-qr`, input.qr)
      : undefined;
    await deps.settings.update(input.clubSlug, {
      ...details,
      ...(paymentQrKey && { paymentQrKey }),
    });
  };
}
