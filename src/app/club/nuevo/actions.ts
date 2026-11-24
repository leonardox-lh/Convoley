"use server";

import { redirect } from "next/navigation";
import { createClub } from "@/modules/clubs";
import { currentUserId, SIGN_IN_PATH } from "@/modules/identity";
import {
  domainErrorMessage,
  logoFromForm,
  newClubSchema,
  type ClubFormState,
} from "../club-form-schema";

export async function createClubAction(
  _previous: ClubFormState,
  formData: FormData,
): Promise<ClubFormState> {
  const userId = await currentUserId();
  if (!userId) redirect(SIGN_IN_PATH);
  const parsed = newClubSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const { slug: wantedSlug, ...profile } = parsed.data;

  let slug: string;
  try {
    ({ slug } = await createClub({
      adminUserId: userId,
      slug: wantedSlug,
      profile,
      logo: await logoFromForm(formData),
    }));
  } catch (error) {
    const message = domainErrorMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  redirect(`/admin/${slug}/perfil?creado=1`);
}
