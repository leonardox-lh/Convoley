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
