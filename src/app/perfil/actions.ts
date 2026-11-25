"use server";

import { revalidatePath } from "next/cache";
import {
  currentUserId,
  PhoneLinkedToAnotherAccountError,
  updatePlayerProfile,
} from "@/modules/identity";
import { profileSchema } from "./profile-schema";

export type ProfileState =
  { status: "idle" } | { status: "saved" } | { status: "error"; message: string };

export async function updateProfileAction(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const userId = await currentUserId();
  if (!userId) return { status: "error", message: "Tu sesión terminó. Vuelve a ingresar." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  try {
    await updatePlayerProfile(userId, parsed.data);
  } catch (error) {
    if (error instanceof PhoneLinkedToAnotherAccountError) {
      return { status: "error", message: "Ese celular ya está en otra cuenta." };
    }
    throw error;
  }
  revalidatePath("/perfil");
  return { status: "saved" };
}
