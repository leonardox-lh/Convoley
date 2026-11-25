"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  InvalidSecurityCodeError,
  MercadoPagoChargeError,
  InvalidVoucherTypeError,
  MAX_VOUCHER_BYTES,
  VoucherTooLargeError,
} from "@/modules/payments";
import {
  EventNotOpenError,
  MercadoPagoUnavailableError,
  NoBalanceError,
  NoCreditError,
  payWithBalance,
  payWithCredit,
  PaymentNotExpectedError,
  RegistrationNotFoundError,
  startMercadoPagoPayment,
  submitVoucher,
} from "@/modules/registrations";
import { rejectionMessage } from "./mercado-pago-messages";

export type VoucherState = { status: "idle" } | { status: "error"; message: string };

const SECURITY_CODE_MESSAGE = "El código de seguridad son solo números (3 en Yape).";

const voucherSchema = z.object({
  registrationId: z.string().min(1),
  // Same rule as the payments module, checked first so a bad code doesn't upload the image.
  yapeSecurityCode: z
    .string()
    .trim()
    .regex(/^(\d{3,6})?$/, SECURITY_CODE_MESSAGE)
    .optional(),
});

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [InvalidVoucherTypeError, "Sube una imagen JPG, PNG o WebP (la captura de tu pago)."],
  [VoucherTooLargeError, "La imagen debe pesar hasta 5 MB."],
  [InvalidSecurityCodeError, SECURITY_CODE_MESSAGE],
  [PaymentNotExpectedError, "Esta inscripción no tiene un pago pendiente. Recarga la página."],
  [EventNotOpenError, "Esta convocatoria ya no recibe pagos."],
  [RegistrationNotFoundError, "No encontramos tu inscripción."],
];

export async function submitVoucherAction(
  _previous: VoucherState,
  formData: FormData,
): Promise<VoucherState> {
  const parsed = voucherSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const file = formData.get("voucher");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Elige la captura de tu pago." };
  }
  if (file.size > MAX_VOUCHER_BYTES) {
    return { status: "error", message: "La imagen debe pesar hasta 5 MB." };
  }

  const { registrationId } = parsed.data;
  try {
    await submitVoucher({
      registrationId,
      image: { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type },
      yapeSecurityCode: parsed.data.yapeSecurityCode || null,
    });
  } catch (error) {
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  redirect(`/inscripcion/${encodeURIComponent(registrationId)}?enviado=1`);
}

export type CreditState = { status: "idle" } | { status: "error"; message: string };

const creditSchema = z.object({ registrationId: z.string().min(1) });

/** HU-27: the player uses one date of their plan instead of paying. */
export async function payWithCreditAction(
  _previous: CreditState,
  formData: FormData,
): Promise<CreditState> {
  const parsed = creditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "No encontramos tu inscripción." };
  try {
    await payWithCredit(parsed.data.registrationId);
  } catch (error) {
    if (error instanceof NoCreditError) {
      return {
        status: "error",
        message: "Ya no tienes fechas disponibles para esta convocatoria.",
      };
    }
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  redirect(`/inscripcion/${encodeURIComponent(parsed.data.registrationId)}?pagado=1`);
}

/** HU-30: the player's balance in favor pays the whole price. */
export async function payWithBalanceAction(
  _previous: CreditState,
  formData: FormData,
): Promise<CreditState> {
  const parsed = creditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "No encontramos tu inscripción." };
  try {
    await payWithBalance(parsed.data.registrationId);
  } catch (error) {
    if (error instanceof NoBalanceError) {
      return { status: "error", message: "Tu saldo a favor ya no alcanza para esta convocatoria." };
    }
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  redirect(`/inscripcion/${encodeURIComponent(parsed.data.registrationId)}?pagado=1`);
}

export type MercadoPagoPayState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "pending" }
  | { status: "refunded"; message: string };

const mercadoPagoSchema = z.object({
  registrationId: z.string().min(1),
  token: z.string().min(1, "No se pudo leer tu medio de pago. Inténtalo de nuevo."),
  paymentMethodId: z.string().min(1).max(40),
  installments: z.coerce.number().int().min(1).max(36).default(1),
  issuerId: z.string().max(40).optional(),
  payerEmail: z.email("Escribe un correo válido: Mercado Pago te envía ahí el comprobante."),
});

const MERCADO_PAGO_ERRORS: [new (...args: never[]) => Error, string][] = [
  [PaymentNotExpectedError, "Esta inscripción no tiene un pago pendiente. Recarga la página."],
  [EventNotOpenError, "Esta convocatoria ya no recibe pagos."],
  [RegistrationNotFoundError, "No encontramos tu inscripción."],
  [MercadoPagoUnavailableError, "Este club no recibe pagos con Mercado Pago. Sube tu captura."],
  [MercadoPagoChargeError, "No pudimos comunicarnos con Mercado Pago. Inténtalo en un momento."],
];

/** HU-19: charge the Yape or card token on the organizer's Mercado Pago account. */
export async function payWithMercadoPagoAction(
  _previous: MercadoPagoPayState,
  formData: FormData,
): Promise<MercadoPagoPayState> {
  const parsed = mercadoPagoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { registrationId, issuerId, ...payment } = parsed.data;

  let outcome: Awaited<ReturnType<typeof startMercadoPagoPayment>>;
  try {
    outcome = await startMercadoPagoPayment({
      registrationId,
      ...payment,
      issuerId: issuerId || null,
    });
  } catch (error) {
    const known = MERCADO_PAGO_ERRORS.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }

  if (outcome.result === "rejected") {
    return { status: "error", message: rejectionMessage(outcome.statusDetail) };
  }
  if (outcome.result === "pending") return { status: "pending" };
  if (outcome.settlement === "refund_to_waitlist") {
    return {
      status: "refunded",
      message:
        "Pagaste justo cuando se llenó el último cupo: te devolvimos el dinero y quedaste en la lista de espera.",
    };
  }
  if (outcome.settlement === "refund") {
    return {
      status: "refunded",
      message: "Este pago no se pudo usar y te lo devolvimos automáticamente.",
    };
  }
  redirect(`/inscripcion/${encodeURIComponent(registrationId)}?pagado=1`);
}
