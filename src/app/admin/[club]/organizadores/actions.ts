"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import {
  ClubMemberNotFoundError,
  createInvitation,
  LastAdminError,
  removeClubMember,
} from "@/modules/clubs";
import { NOT_ALLOWED_MESSAGE } from "../convocatorias/event-form-schema";
import { requireOrganizer } from "../require-organizer";

export type InviteState =
  { status: "idle" } | { status: "done"; link: string } | { status: "error"; message: string };
export type RemoveMemberState = { status: "idle" } | { status: "error"; message: string };

const inviteSchema = z.object({
  clubSlug: z.string().min(1),
  role: z.enum(["admin", "helper"], "Elige un rol."),
});
const removeSchema = z.object({ clubSlug: z.string().min(1), userId: z.string().min(1) });

export async function createInvitationAction(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const organizer = await requireOrganizer(parsed.data.clubSlug, "manage_club");
  if (!organizer) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  const token = await createInvitation({ ...parsed.data, createdByUserId: organizer.userId });
  return { status: "done", link: `${await appUrl()}/invitacion/${token}` };
}

export async function removeMemberAction(
  _previous: RemoveMemberState,
  formData: FormData,
): Promise<RemoveMemberState> {
  const parsed = removeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: NOT_ALLOWED_MESSAGE };
  if (!(await requireOrganizer(parsed.data.clubSlug, "manage_club"))) {
    return { status: "error", message: NOT_ALLOWED_MESSAGE };
  }
  try {
    await removeClubMember(parsed.data);
  } catch (error) {
    if (error instanceof LastAdminError) {
      return { status: "error", message: "Tu club necesita al menos un administrador." };
    }
    if (error instanceof ClubMemberNotFoundError) {
      return { status: "error", message: "Esa persona ya no es organizadora. Recarga la página." };
    }
    throw error;
  }
  revalidatePath(`/admin/${parsed.data.clubSlug}/organizadores`);
  return { status: "idle" };
}
