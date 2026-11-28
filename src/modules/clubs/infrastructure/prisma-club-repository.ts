import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ClubRepository } from "../application/ports";
import { defaultLevelRows } from "../domain/community";
import { ClubAlreadyOwnedError, ClubSlugTakenError } from "../domain/errors";

const UNIQUE_VIOLATION = "P2002";

export function prismaClubRepository(db: PrismaClient): ClubRepository {
  const ownsClub = async (userId: string) =>
    (await db.club.count({ where: { ownerUserId: userId } })) > 0;

  return {
    async createWithAdmin({ slug, profile, logoKey, adminUserId }) {
      try {
        // One nested write: the club never exists without its admin.
        await db.club.create({
          data: {
            slug,
            ownerUserId: adminUserId,
            logoKey,
            ...profile,
            members: { create: { userId: adminUserId, role: "admin" } },
            communities: { create: defaultLevelRows(new Date()) },
          },
        });
      } catch (error) {
        const isUniqueViolation =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
        if (!isUniqueViolation) throw error;
        // Two unique columns: the owner one wins when this user's other club got there first.
        if (await ownsClub(adminUserId)) throw new ClubAlreadyOwnedError(adminUserId);
        throw new ClubSlugTakenError(slug);
      }
    },

    ownsClub,

    async findProfile(slug) {
      return db.club.findUnique({
        where: { slug },
        select: {
          slug: true,
          name: true,
          description: true,
          logoKey: true,
          primaryColor: true,
          secondaryColor: true,
          instagramUrl: true,
          tiktokUrl: true,
          whatsappUrl: true,
          contactPhone: true,
        },
      });
    },

    async updateProfile(slug, changes) {
      await db.club.update({ where: { slug }, data: changes });
    },
  };
}
