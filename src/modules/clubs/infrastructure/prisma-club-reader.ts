import { db } from "@/lib/db";

/** A club with its communities (niveles), for other modules and pages. */
export async function findClubBySlug(slug: string) {
  return db.club.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      communities: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
}

/** The user's role in the club, or null if they are not a member. */
export async function findClubMembership(input: { clubSlug: string; userId: string }) {
  return db.clubMember.findFirst({
    where: { userId: input.userId, club: { slug: input.clubSlug } },
    select: { role: true, clubId: true },
  });
}

/** Slug of the oldest club the user is a member of, or null if they have none. */
export async function findFirstClubSlugForMember(userId: string): Promise<string | null> {
  const membership = await db.clubMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { club: { select: { slug: true } } },
  });
  return membership?.club.slug ?? null;
}

/** Slug and name of several clubs in one query, for lists that span clubs. */
export async function findClubNamesByIds(ids: string[]) {
  return db.club.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, name: true },
  });
}

/** HU-36: every club, newest first, for the platform owner and the home page. */
export async function listAllClubs() {
  return db.club.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      description: true,
      logoKey: true,
      primaryColor: true,
    },
  });
}
