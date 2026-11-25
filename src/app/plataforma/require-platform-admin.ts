import { notFound, redirect } from "next/navigation";
import { currentUserId, isPlatformAdmin, SIGN_IN_PATH } from "@/modules/identity";

/** HU-36: the signed-in Convoley owner's id; anyone else gets a 404. Reads cookies. */
export async function requirePlatformAdmin(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) redirect(SIGN_IN_PATH);
  if (!(await isPlatformAdmin(userId))) notFound();
  return userId;
}
