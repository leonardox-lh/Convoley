"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  findClubBySlug,
  InvalidLogoTypeError,
  InvalidPaymentHolderError,
  InvalidCancellationPolicyError,
  InvalidServiceFeeError,
  LogoTooLargeError,
  MAX_CANCELLATION_DEADLINE_HOURS,
  updateCancellationPolicy,
  updatePaymentSettings,
  updateServiceFee,
} from "@/modules/clubs";
import { solesToCents } from "@/lib/money";
import { percentToBasisPoints } from "./service-fee-input";
import { disconnectMercadoPago } from "@/modules/payments";
import { InvalidPhoneNumberError, PhoneNumber } from "@/modules/registrations";
import { logoFromForm } from "@/app/club/club-form-schema";
import { PHONE_FORMAT_MESSAGE } from "@/app/player-schema";
import { NOT_ALLOWED_MESSAGE } from "../convocatorias/event-form-schema";
import { requireOrganizerToEdit } from "../require-organizer";

export type PaymentSettingsState = { status: "idle" } | { status: "error"; message: string };

const settingsSchema = z.object({
  clubSlug: z.string().min(1),
  paymentPhone: z.string().trim().min(1, "Escribe tu número de Yape o Plin."),
  paymentHolderName: z
    .string()
    .trim()
    .min(1, "Escribe el nombre del titular.")
    .max(60, "Ese nombre es muy largo."),
});

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [InvalidPhoneNumberError, PHONE_FORMAT_MESSAGE],
  [InvalidPaymentHolderError, "Escribe el nombre del titular."],
  [InvalidLogoTypeError, "El QR debe ser una imagen JPG, PNG o WebP."],
  [LogoTooLargeError, "La imagen del QR debe pesar hasta 2 MB."],
];

export async function updatePaymentSettingsAction(
  _previous: PaymentSettingsState,
  formData: FormData,
): Promise<PaymentSettingsState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { clubSlug, paymentHolderName } = parsed.data;
  // Where the money goes is the admin's call, not a helper's.
  if (!(await requireOrganizerToEdit(clubSlug, "manage_club"))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }

  try {
    await updatePaymentSettings({
      clubSlug,
      paymentPhone: PhoneNumber.parse(parsed.data.paymentPhone).value,
      paymentHolderName,
      // Same field handling as the logo: an empty file input keeps the current QR.
      qr: await logoFromForm(renameFile(formData, "qr", "logo")),
    });
  } catch (error) {
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  redirect(`/admin/${clubSlug}/pagos?guardado=1`);
}

function renameFile(formData: FormData, from: string, to: string) {
  const copy = new FormData();
  const file = formData.get(from);
  if (file) copy.set(to, file);
  return copy;
}

export type ServiceFeeState = { status: "idle" } | { status: "error"; message: string };

const serviceFeeSchema = z.object({
  clubSlug: z.string().min(1),
  kind: z.enum(["none", "fixed", "percent"]),
  amount: z.string().trim().default(""),
});

/** HU-22: only the admin decides what players pay on top of the price. */
export async function updateServiceFeeAction(
  _previous: ServiceFeeState,
  formData: FormData,
): Promise<ServiceFeeState> {
  const parsed = serviceFeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Elige un tipo de cargo." };
  const { clubSlug, kind, amount } = parsed.data;
  if (!(await requireOrganizerToEdit(clubSlug, "manage_club"))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }
  const value =
    kind === "none" ? 0 : kind === "fixed" ? solesToCents(amount) : percentToBasisPoints(amount);
  if (value === null) {
    return { status: "error", message: "Escribe un monto válido, por ejemplo 1.50 o 3.5." };
  }

  try {
    await updateServiceFee({ clubSlug, kind, amount: value });
  } catch (error) {
    if (error instanceof InvalidServiceFeeError) {
      return { status: "error", message: "El cargo debe ser mayor a 0 y hasta S/ 50 o 20 %." };
    }
    throw error;
  }
  redirect(`/admin/${clubSlug}/pagos?guardado=1`);
}

const disconnectSchema = z.object({ clubSlug: z.string().min(1) });

/** HU-18: forget the Mercado Pago tokens; players go back to paying by voucher. */
export async function disconnectMercadoPagoAction(formData: FormData): Promise<void> {
  const { clubSlug } = disconnectSchema.parse(Object.fromEntries(formData));
  if (!(await requireOrganizerToEdit(clubSlug, "manage_club"))) return;
  const club = await findClubBySlug(clubSlug);
  if (club) await disconnectMercadoPago(club.id);
  redirect(`/admin/${clubSlug}/pagos?mp=desconectado`);
}

export type CancellationPolicyState = { status: "idle" } | { status: "error"; message: string };

const POLICY_MESSAGE = `Escribe las horas entre 0 y ${MAX_CANCELLATION_DEADLINE_HOURS}, o déjalo vacío.`;
const policySchema = z.object({
  clubSlug: z.string().min(1),
  // Empty = no policy: cancelling a paid sign-up loses the payment.
  deadlineHours: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number(POLICY_MESSAGE).int(POLICY_MESSAGE).nullable()),
});

/** HU-30: until how many hours before the game a cancelling player keeps their payment. */
export async function updateCancellationPolicyAction(
  _previous: CancellationPolicyState,
  formData: FormData,
): Promise<CancellationPolicyState> {
  const parsed = policySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: POLICY_MESSAGE };
  if (!(await requireOrganizerToEdit(parsed.data.clubSlug, "manage_club"))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }
  try {
    await updateCancellationPolicy(parsed.data);
  } catch (error) {
    if (error instanceof InvalidCancellationPolicyError) {
      return { status: "error", message: POLICY_MESSAGE };
    }
    throw error;
  }
  redirect(`/admin/${parsed.data.clubSlug}/pagos?guardado=1`);
}
