"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  COMMUNITY_NAME_MAX_LENGTH,
  CommunityInUseError,
  CommunityNameTakenError,
  CommunityNotFoundError,
  createCommunity,
  deleteCommunity,
  InvalidCommunityNameError,
  LastCommunityError,
  renameCommunity,
} from "@/modules/clubs";
import { NOT_ALLOWED_MESSAGE } from "../convocatorias/event-form-schema";
import { requireOrganizer } from "../require-organizer";

export type CommunityActionState = { status: "idle" } | { status: "error"; message: string };

const nameField = z
  .string()
  .trim()
  .min(1, "Escribe el nombre.")
  .max(COMMUNITY_NAME_MAX_LENGTH, "Ese nombre es muy largo.");
const createSchema = z.object({ clubSlug: z.string().min(1), name: nameField });
const renameSchema = createSchema.extend({ communityId: z.string().min(1) });
const deleteSchema = z.object({ clubSlug: z.string().min(1), communityId: z.string().min(1) });

const ERROR_MESSAGES: [new (...args: never[]) => Error, string][] = [
  [InvalidCommunityNameError, "Escribe un nombre de hasta 40 letras."],
  [CommunityNameTakenError, "Ya tienes una comunidad con ese nombre."],
  [CommunityNotFoundError, "No encontramos esa comunidad. Recarga la página."],
  [CommunityInUseError, "Tiene convocatorias: cámbialas de comunidad antes de eliminarla."],
  [LastCommunityError, "Tu club necesita al menos una comunidad."],
];

async function run(clubSlug: string, work: () => Promise<void>): Promise<CommunityActionState> {
  // Communities shape the club, so only its admin changes them (like the profile).
  if ((await requireOrganizer(clubSlug))?.role !== "admin") {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }
  try {
    await work();
  } catch (error) {
    const known = ERROR_MESSAGES.find(([type]) => error instanceof type);
    if (known) return { status: "error", message: known[1] };
    throw error;
  }
  revalidatePath(`/admin/${clubSlug}/comunidades`);
  return { status: "idle" };
}

export async function createCommunityAction(
  _previous: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  return run(parsed.data.clubSlug, () => createCommunity(parsed.data));
}

export async function renameCommunityAction(
  _previous: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const parsed = renameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  return run(parsed.data.clubSlug, () => renameCommunity(parsed.data));
}

export async function deleteCommunityAction(
  _previous: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "No encontramos esa comunidad." };
  return run(parsed.data.clubSlug, () => deleteCommunity(parsed.data));
}
