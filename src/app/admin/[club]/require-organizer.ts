import { redirect } from "next/navigation";
import { can, type ClubPermission, findClubMembership } from "@/modules/clubs";
import { currentUserId, SIGN_IN_PATH } from "@/modules/identity";

/**
 * Checks that the signed-in user is a member of the club with the given permission (HU-33).
 * Without a session it redirects to the sign-in page; otherwise it returns null when not allowed,
 * so pages answer 404 and server actions an error message.
 * Reads cookies: in pages, call it inside <Suspense>.
 */
export async function requireOrganizer(clubSlug: string, permission: ClubPermission) {
  const userId = await currentUserId();
  if (!userId) redirect(SIGN_IN_PATH);
  const membership = await findClubMembership({ clubSlug, userId });
  if (!membership || !can(membership.role, permission)) return null;
  return { userId, role: membership.role };
}
