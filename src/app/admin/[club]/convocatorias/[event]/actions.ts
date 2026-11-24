"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerEvent } from "@/modules/events";
import {
  addPlayerManually,
  approveVoucher,
  InvalidRejectionReasonError,
  NothingToReviewError,
  rejectVoucher,
  DuplicateRegistrationError,
  EventFullError,
  EventNotOpenError,
  InvalidPhoneNumberError,
  markPaidManually,
  RegistrationNotFoundError,
  removeRegistration,
} from "@/modules/registrations";
import { nameField, PHONE_FORMAT_MESSAGE } from "../../../../player-schema";
import { NOT_ALLOWED_MESSAGE } from "../event-form-schema";
import { requireOrganizer } from "../../require-organizer";

export type RegistrationActionState =
  { status: "idle" } | { status: "error"; message: string } | { status: "done"; message: string };

const targetSchema = z.object({
  clubSlug: z.string().min(1),
  eventId: z.string().min(1),
});

const addPlayerSchema = targetSchema.extend({
  firstName: nameField("Escribe el nombre."),
  lastName: nameField("Escribe el apellido."),
  phone: z.string().trim().min(1, "Escribe el celular."),
  markPaid: z.literal("on").optional(),
});

const registrationSchema = targetSchema.extend({ registrationId: z.string().min(1) });

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [InvalidPhoneNumberError, PHONE_FORMAT_MESSAGE],
  [DuplicateRegistrationError, "Ese celular ya está inscrito en esta convocatoria."],
  [EventFullError, "Ya no quedan cupos."],
  [EventNotOpenError, "Esta convocatoria ya no acepta cambios en la lista."],
  [RegistrationNotFoundError, "No encontramos esa inscripción. Recarga la lista."],
  [NothingToReviewError, "Esa captura ya fue revisada. Recarga la lista."],
  [InvalidRejectionReasonError, "Escribe el motivo del rechazo (hasta 200 letras)."],
];

/** The organizer's user id, only if they manage the club and the event belongs to it. */
async function authorize(target: z.infer<typeof targetSchema>) {
  const organizer = await requireOrganizer(target.clubSlug);
  if (!organizer) return null;
  const event = await getOrganizerEvent({ clubSlug: target.clubSlug, eventId: target.eventId });
  return event ? organizer.userId : null;
}

async function run(
  target: z.infer<typeof targetSchema>,
  work: (userId: string) => Promise<string>,
): Promise<RegistrationActionState> {
  const userId = await authorize(target);
  if (!userId) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  try {
    const message = await work(userId);
    revalidatePath(`/admin/${target.clubSlug}/convocatorias/${target.eventId}`);
    return { status: "done", message };
  } catch (error) {
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
}

export async function addPlayerAction(
  _previous: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const parsed = addPlayerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { markPaid, ...player } = parsed.data;

  return run(parsed.data, async (organizerUserId) => {
    await addPlayerManually({ ...player, markPaid: markPaid === "on", organizerUserId });
    return `${player.firstName} quedó inscrito.`;
  });
}

export async function markPaidManuallyAction(
  _previous: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "No encontramos esa inscripción." };

  return run(parsed.data, async (reviewedByUserId) => {
    await markPaidManually({ ...parsed.data, reviewedByUserId });
    return "Marcado como pagado.";
  });
}

export async function removeRegistrationAction(
  _previous: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "No encontramos esa inscripción." };

  return run(parsed.data, async () => {
    await removeRegistration(parsed.data);
    return "Jugador quitado: su cupo quedó libre.";
  });
}

export async function approveVoucherAction(
  _previous: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "No encontramos esa inscripción." };

  return run(parsed.data, async (reviewedByUserId) => {
    await approveVoucher({ ...parsed.data, reviewedByUserId });
    return "Pago aprobado.";
  });
}

const rejectSchema = registrationSchema.extend({
  reason: z
    .string()
    .trim()
    .min(1, "Escribe el motivo del rechazo.")
    .max(200, "Ese motivo es muy largo."),
});

export async function rejectVoucherAction(
  _previous: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  return run(parsed.data, async (reviewedByUserId) => {
    await rejectVoucher({ ...parsed.data, reviewedByUserId });
    return "Captura rechazada: el jugador verá el motivo.";
  });
}
