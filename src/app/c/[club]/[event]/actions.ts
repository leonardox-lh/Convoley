"use server";

import { z } from "zod";
import { currentUserId, signIn } from "@/modules/identity";
import {
  DuplicateRegistrationError,
  EventFullError,
  EventNotOpenError,
  InvalidPhoneNumberError,
  registerGuest,
} from "@/modules/registrations";
import { nameField, PHONE_FORMAT_MESSAGE } from "../../../player-schema";

export type RegisterState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "registered"; firstName: string };

const registerSchema = z.object({
  eventId: z.string().min(1),
  firstName: nameField("Escribe tu nombre."),
  lastName: nameField("Escribe tu apellido."),
  phone: z.string().trim().min(1, "Escribe tu celular."),
});

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [InvalidPhoneNumberError, PHONE_FORMAT_MESSAGE],
  [DuplicateRegistrationError, "Ese celular ya está inscrito en esta convocatoria."],
  [EventFullError, "Lo sentimos, ya no quedan cupos."],
  [EventNotOpenError, "Esta convocatoria ya no recibe inscripciones."],
];

export async function registerAction(
  _previous: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  try {
    await registerGuest({ ...parsed.data, userId: await currentUserId() });
  } catch (error) {
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  return { status: "registered", firstName: parsed.data.firstName };
}

const eventPathSchema = z.object({ club: z.string().min(1), eventId: z.string().min(1) });

export async function continueWithGoogleAction(formData: FormData): Promise<void> {
  const { club, eventId } = eventPathSchema.parse(Object.fromEntries(formData));
  // Built here, not taken from the form, so the redirect can't point anywhere else.
  const redirectTo = `/c/${encodeURIComponent(club)}/${encodeURIComponent(eventId)}`;
  await signIn("google", { redirectTo });
}
