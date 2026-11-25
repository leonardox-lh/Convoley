"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptInvitation, InvitationExpiredError, InvitationInvalidError } from "@/modules/clubs";
import { currentUserId, SIGN_IN_PATH } from "@/modules/identity";
import { INVITATION_ERROR_MESSAGES } from "./messages";

export type AcceptInvitationState = { status: "idle" } | { status: "error"; message: string };

const tokenSchema = z.string().min(1).max(100);

export async function acceptInvitationAction(
  _previous: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const token = tokenSchema.safeParse(formData.get("token"));
  if (!token.success) return { status: "error", message: INVITATION_ERROR_MESSAGES.invalid };
  const userId = await currentUserId();
  if (!userId) redirect(SIGN_IN_PATH);
  let clubSlug: string;
  try {
    ({ clubSlug } = await acceptInvitation({ token: token.data, userId }));
  } catch (error) {
    if (error instanceof InvitationExpiredError) {
      return { status: "error", message: INVITATION_ERROR_MESSAGES.expired };
    }
    if (error instanceof InvitationInvalidError) {
      return { status: "error", message: INVITATION_ERROR_MESSAGES.invalid };
    }
    throw error;
  }
  redirect(`/admin/${clubSlug}`);
}
