import { redirect } from "next/navigation";
import { findClubMembership } from "@/modules/clubs";
import { currentUserId, SIGN_IN_PATH } from "@/modules/identity";

/**
 * Checks that the signed-in user is a member (admin or helper) of the club.
 * Without a session it redirects to the sign-in page; for a non-member it returns null,
 * so pages answer 404 and server actions an error message.
 * Reads cookies: in pages, call it inside <Suspense>.
 */
export async function requireOrganizer(clubSlug: string) {
  const userId = await currentUserId();
  if (!userId) redirect(SIGN_IN_PATH);
  const membership = await findClubMembership({ clubSlug, userId });
  return membership && { userId, role: membership.role };
}
