"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  currentUserId,
  getPlayerProfile,
  PhoneLinkedToAnotherAccountError,
  savePlayerPhone,
  signIn,
} from "@/modules/identity";
import {
  DuplicatePlayerNameError,
  DuplicateRegistrationError,
  EventFullError,
  EventNotOpenError,
  InvalidPhoneNumberError,
  linkGuestRegistrations,
  PhoneNumber,
  registerGuest,
} from "@/modules/registrations";
import {
  genderField,
  levelField,
  nameField,
  optionalNameField,
  PHONE_FORMAT_MESSAGE,
  positionField,
} from "../../../player-schema";

export type RegisterState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "registered";
      registrationId: string;
      firstName: string;
      /** Set when the event was full and the player joined the waitlist (HU-12). */
      waitlistPosition: number | null;
    };

const registerSchema = z.object({
  eventId: z.string().min(1),
  firstName: nameField("Escribe tu nombre."),
  lastName: optionalNameField,
  phone: z.string().trim().default(""),
  position: positionField,
  level: levelField,
  gender: genderField,
});

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [InvalidPhoneNumberError, PHONE_FORMAT_MESSAGE],
  [DuplicateRegistrationError, "Ese celular ya está inscrito en esta convocatoria."],
  [
    DuplicatePlayerNameError,
    "Ya hay alguien inscrito con ese nombre. Agrega tu apellido o un apodo para diferenciarte.",
  ],
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
  // Players need an account to sign up; the organizer's "Agregar jugador" covers everyone else.
  if (!userId)
    return { status: "error", message: "Inicia sesión para unirte a esta convocatoria." };
  const profile = await getPlayerProfile(userId);
  // A Google player's names and phone come from their account, not from the form (HU-48).
  const player = {
    ...parsed.data,
    firstName: profile?.firstName || parsed.data.firstName,
    lastName: profile?.lastName || parsed.data.lastName,
    phone: profile?.phone ?? (parsed.data.phone || null),
  };

  let registrationId: string;
  let waitlistPosition: number | null;
  try {
    ({ id: registrationId, waitlistPosition } = await registerGuest({ ...player, userId }));
  } catch (error) {
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  if (userId && profile && !profile.phone && player.phone) {
    await rememberPhone(userId, player.phone);
  }
  // The list and spots on this page include the new sign-up right away.
  revalidatePath("/c/[club]/[event]", "page");
  return { status: "registered", registrationId, firstName: player.firstName, waitlistPosition };
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
