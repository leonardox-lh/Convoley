import type { PrismaClient } from "@/generated/prisma/client";

/** Parses PLATFORM_ADMIN_EMAILS ("a@x.pe, b@x.pe") into lowercase emails. */
export const parseAdminEmails = (raw: string | undefined) =>
  new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

/**
 * HU-36: the Convoley owner is a listed email AND a linked Google account. The Google check
 * stops someone from signing up with email + password using the owner's email first.
 */
export async function isPlatformAdmin(
  db: PrismaClient,
  adminEmails: Set<string>,
  userId: string,
): Promise<boolean> {
  if (adminEmails.size === 0) return false;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, accounts: { where: { provider: "google" }, select: { id: true } } },
  });
  return !!user?.email && adminEmails.has(user.email.toLowerCase()) && user.accounts.length > 0;
}
