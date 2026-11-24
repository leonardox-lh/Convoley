import { InvalidPaymentHolderError, InvalidPaymentPhoneError } from "./errors";

const HOLDER_MAX_LENGTH = 60;
// Normalized by the caller (+519XXXXXXXX), like every phone in Convoley.
const NORMALIZED_PERU_MOBILE = /^\+519\d{8}$/;

/** Yape/Plin details players see to pay the organizer directly; Convoley never holds money. */
export interface PaymentSettings {
  paymentPhone: string;
  paymentHolderName: string;
}

export function validatePaymentSettings(raw: PaymentSettings): PaymentSettings {
  if (!NORMALIZED_PERU_MOBILE.test(raw.paymentPhone)) {
    throw new InvalidPaymentPhoneError(raw.paymentPhone);
  }
  const paymentHolderName = raw.paymentHolderName.trim();
  if (!paymentHolderName || paymentHolderName.length > HOLDER_MAX_LENGTH) {
    throw new InvalidPaymentHolderError();
  }
  return { paymentPhone: raw.paymentPhone, paymentHolderName };
}
