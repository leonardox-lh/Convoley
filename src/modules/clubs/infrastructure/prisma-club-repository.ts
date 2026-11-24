import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ClubRepository } from "../application/ports";
import { ClubSlugTakenError } from "../domain/errors";

const UNIQUE_VIOLATION = "P2002";
const DEFAULT_COMMUNITY_NAME = "General";

export function prismaClubRepository(db: PrismaClient): ClubRepository {
  return {
    async createWithAdmin({ slug, profile, logoKey, adminUserId }) {
      try {
        // One nested write: the club never exists without its admin.
        await db.club.create({
          data: {
            slug,
            logoKey,
            ...profile,
            members: { create: { userId: adminUserId, role: "admin" } },
            communities: { create: { name: DEFAULT_COMMUNITY_NAME } },
          },
        });
      } catch (error) {
        const isSlugTaken =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION;
        if (isSlugTaken) throw new ClubSlugTakenError(slug);
        throw error;
      }
    },

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
        },
      });
    },

    async updateProfile(slug, changes) {
      await db.club.update({ where: { slug }, data: changes });
    },
  };
}
