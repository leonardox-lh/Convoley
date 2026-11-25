"use server";

import { redirect } from "next/navigation";
import { updateClubProfile } from "@/modules/clubs";
import {
  domainErrorMessage,
  editClubSchema,
  logoFromForm,
  type ClubFormState,
} from "@/app/club/club-form-schema";
import { NOT_ALLOWED_MESSAGE } from "../convocatorias/event-form-schema";
import { requireOrganizerToEdit } from "../require-organizer";

export async function updateClubProfileAction(
  _previous: ClubFormState,
  formData: FormData,
): Promise<ClubFormState> {
  const parsed = editClubSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { clubSlug, ...profile } = parsed.data;
  // Only the admin edits the club's identity; helpers manage events.
  if (!(await requireOrganizerToEdit(clubSlug, "manage_club"))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }

  try {
    await updateClubProfile({ clubSlug, profile, logo: await logoFromForm(formData) });
  } catch (error) {
    const message = domainErrorMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  redirect(`/admin/${clubSlug}/perfil?guardado=1`);
}
