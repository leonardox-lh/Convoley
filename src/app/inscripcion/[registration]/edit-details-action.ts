"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { editOwnDetails, PlayerDetailsLockedError } from "@/modules/registrations";
import { genderField, levelField, positionField } from "../../player-schema";

export type EditDetailsState = { status: "idle" | "saved" } | { status: "error"; message: string };

const editDetailsSchema = z.object({
  registrationId: z.string().min(1),
  position: positionField,
  level: levelField,
  gender: genderField,
});

/** The player fixes or adds their position, level and gender from their private link. */
export async function editDetailsAction(
  _previous: EditDetailsState,
  formData: FormData,
): Promise<EditDetailsState> {
  const parsed = editDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Revisa los datos e intenta otra vez." };
  const { registrationId, position, level, gender } = parsed.data;
  try {
    await editOwnDetails({
      registrationId,
      // Gender is asked only in mixed events: without the field it stays as it was.
      details: { position: position ?? null, level: level ?? null, gender },
    });
  } catch (error) {
    if (error instanceof PlayerDetailsLockedError)
      return {
        status: "error",
        message: "Ya no puedes cambiar tus datos: los equipos están armados.",
      };
    throw error;
  }
  revalidatePath("/", "layout");
  return { status: "saved" };
}
