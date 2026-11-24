"use server";

import { z } from "zod";
import {
  currentUserId,
  getPlayerProfile,
  PhoneLinkedToAnotherAccountError,
  savePlayerPhone,
  signIn,
} from "@/modules/identity";
import {
  DuplicateRegistrationError,
  EventFullError,
  EventNotOpenError,
  InvalidPhoneNumberError,
  linkGuestRegistrations,
  PhoneNumber,
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

  const userId = await currentUserId();
  const profile = userId ? await getPlayerProfile(userId) : null;
  // A Google player's names and phone come from their account, not from the form (HU-48).
  const player = {
    ...parsed.data,
    firstName: profile?.firstName || parsed.data.firstName,
    lastName: profile?.lastName || parsed.data.lastName,
    phone: profile?.phone ?? parsed.data.phone,
  };

  try {
    await registerGuest({ ...player, userId });
  } catch (error) {
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  if (userId && profile && !profile.phone) await rememberPhone(userId, player.phone);
  return { status: "registered", firstName: player.firstName };
}

/** First sign-up with Google: keep the phone and bring in the earlier guest sign-ups. */
async function rememberPhone(userId: string, rawPhone: string) {
  const phone = PhoneNumber.parse(rawPhone).value;
  try {
    await savePlayerPhone({ userId, phone });
  } catch (error) {
    // Another account owns this phone: the sign-up stands, its guest history stays there.
    if (error instanceof PhoneLinkedToAnotherAccountError) return;
    throw error;
  }
  await linkGuestRegistrations({ userId, phone });
}

const eventPathSchema = z.object({ club: z.string().min(1), eventId: z.string().min(1) });

export async function continueWithGoogleAction(formData: FormData): Promise<void> {
  const { club, eventId } = eventPathSchema.parse(Object.fromEntries(formData));
  // Built here, not taken from the form, so the redirect can't point anywhere else.
  const redirectTo = `/c/${encodeURIComponent(club)}/${encodeURIComponent(eventId)}`;
  await signIn("google", { redirectTo });
}
