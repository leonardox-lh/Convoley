import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CommunityRepository } from "../application/ports";
import { CommunityInUseError, CommunityNameTakenError } from "../domain/errors";

const UNIQUE_VIOLATION = "P2002";
// Event.communityId is ON DELETE RESTRICT: the database refuses to orphan events.
const FOREIGN_KEY_VIOLATION = "P2003";

const isPrismaError = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

export function prismaCommunityRepository(db: PrismaClient): CommunityRepository {
  return {
    async findClubId(clubSlug) {
      const club = await db.club.findUnique({ where: { slug: clubSlug }, select: { id: true } });
      return club?.id ?? null;
    },

    async list(clubId) {
      const rows = await db.community.findMany({
        where: { clubId },
        select: {
          id: true,
          name: true,
          _count: { select: { events: true, recurringEvents: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(({ _count, ...community }) => ({
        ...community,
        eventCount: _count.events,
        recurringEventCount: _count.recurringEvents,
      }));
    },

    async create(clubId, name) {
      try {
        await db.community.create({ data: { clubId, name } });
      } catch (error) {
        if (isPrismaError(error, UNIQUE_VIOLATION)) throw new CommunityNameTakenError(name);
        throw error;
      }
    },

    async rename(id, name) {
      try {
        await db.community.update({ where: { id }, data: { name } });
      } catch (error) {
        if (isPrismaError(error, UNIQUE_VIOLATION)) throw new CommunityNameTakenError(name);
        throw error;
      }
    },

    async delete(id) {
      try {
        await db.community.delete({ where: { id } });
      } catch (error) {
        if (isPrismaError(error, FOREIGN_KEY_VIOLATION)) throw new CommunityInUseError(id);
        throw error;
      }
    },
  };
}
