"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  InvalidSecurityCodeError,
  InvalidVoucherTypeError,
  MAX_VOUCHER_BYTES,
  MercadoPagoChargeError,
  VoucherTooLargeError,
} from "@/modules/payments";
import {
  MercadoPagoUnavailableError,
  PlanPurchaseNotFoundError,
  PlanPurchaseStatusError,
  startPlanMercadoPagoPayment,
  submitPlanVoucher,
} from "@/modules/plans";
import type { MercadoPagoPayState, VoucherState } from "../../inscripcion/[registration]/actions";
import { rejectionMessage } from "../../inscripcion/[registration]/mercado-pago-messages";

const NOT_PENDING_MESSAGE = "Este plan no tiene un pago pendiente. Recarga la página.";

const mercadoPagoSchema = z.object({
  purchaseId: z.string().min(1),
  token: z.string().min(1, "No se pudo leer tu medio de pago. Inténtalo de nuevo."),
  paymentMethodId: z.string().min(1).max(40),
  installments: z.coerce.number().int().min(1).max(36).default(1),
  issuerId: z.string().max(40).optional(),
  payerEmail: z.email("Escribe un correo válido: Mercado Pago te envía ahí el comprobante."),
});

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [PlanPurchaseStatusError, NOT_PENDING_MESSAGE],
  [PlanPurchaseNotFoundError, "No encontramos tu plan."],
  [MercadoPagoUnavailableError, "Este club no recibe pagos con Mercado Pago. Sube tu captura."],
  [MercadoPagoChargeError, "No pudimos comunicarnos con Mercado Pago. Inténtalo en un momento."],
  [InvalidVoucherTypeError, "Sube una imagen JPG, PNG o WebP (la captura de tu pago)."],
  [VoucherTooLargeError, "La imagen debe pesar hasta 5 MB."],
  [InvalidSecurityCodeError, "El código de seguridad son solo números (3 en Yape)."],
];

function knownError(error: unknown) {
  const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
  if (known) return { status: "error" as const, message: known[1] };
  throw error;
}

/** HU-27: pay the plan with Yape or card on the organizer's Mercado Pago account. */
export async function payPlanWithMercadoPagoAction(
  _previous: MercadoPagoPayState,
  formData: FormData,
): Promise<MercadoPagoPayState> {
  const parsed = mercadoPagoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { purchaseId, issuerId, ...payment } = parsed.data;

  let outcome: Awaited<ReturnType<typeof startPlanMercadoPagoPayment>>;
  try {
    outcome = await startPlanMercadoPagoPayment({
      purchaseId,
      ...payment,
      issuerId: issuerId || null,
    });
  } catch (error) {
    return knownError(error);
  }
  if (outcome.result === "rejected") {
    return { status: "error", message: rejectionMessage(outcome.statusDetail) };
  }
  if (outcome.result === "pending") return { status: "pending" };
  if (outcome.settlement === "refund") {
    return { status: "refunded", message: "Este plan ya estaba pagado: te devolvimos el dinero." };
  }
  redirect(`/plan/${encodeURIComponent(purchaseId)}?pagado=1`);
}

const voucherSchema = z.object({
  purchaseId: z.string().min(1),
  yapeSecurityCode: z
    .string()
    .trim()
    .regex(/^(\d{3,6})?$/, "El código de seguridad son solo números (3 en Yape).")
    .optional(),
});

/** HU-27: the player paid by Yape/Plin outside Convoley and uploads the screenshot. */
export async function submitPlanVoucherAction(
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
  try {
    await submitPlanVoucher({
      purchaseId: parsed.data.purchaseId,
      image: { bytes: new Uint8Array(await file.arrayBuffer()), contentType: file.type },
      yapeSecurityCode: parsed.data.yapeSecurityCode || null,
    });
  } catch (error) {
    return knownError(error);
  }
  redirect(`/plan/${encodeURIComponent(parsed.data.purchaseId)}?enviado=1`);
}
