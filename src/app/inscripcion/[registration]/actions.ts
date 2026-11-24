"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  InvalidSecurityCodeError,
  InvalidVoucherTypeError,
  MAX_VOUCHER_BYTES,
  VoucherTooLargeError,
} from "@/modules/payments";
import {
  EventNotOpenError,
  PaymentNotExpectedError,
  RegistrationNotFoundError,
  submitVoucher,
} from "@/modules/registrations";

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
