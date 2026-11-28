import type { CancellationResult } from "@/modules/registrations";

/** HU-29/HU-30: what happened to the payment after the player cancelled their own sign-up. */
export const CANCELLED_MESSAGES: Record<CancellationResult, string> = {
  nothing_paid: "Tu cupo quedó libre.",
  balance: "Lo que pagaste quedó como saldo a favor en el club.",
  returned: "Te devolvimos tu fecha o tu saldo.",
  forfeited: "Como fue después del límite, el pago se pierde.",
  guest_forfeited: "Como te inscribiste sin cuenta de Google, el pago no quedó como saldo.",
};

export function isCancellationResult(value: unknown): value is CancellationResult {
  return typeof value === "string" && value in CANCELLED_MESSAGES;
}
