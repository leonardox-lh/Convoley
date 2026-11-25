import type { PrismaClient } from "@/generated/prisma/client";
import type { ClubMemberRepository } from "../application/ports";

export function prismaClubMemberRepository(db: PrismaClient): ClubMemberRepository {
  return {
    async findClubId(clubSlug) {
      const club = await db.club.findUnique({ where: { slug: clubSlug }, select: { id: true } });
      return club?.id ?? null;
    },

    async createInvitation(input) {
      await db.clubInvitation.create({ data: input });
    },

    async findInvitation(tokenHash) {
      const row = await db.clubInvitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          clubId: true,
          role: true,
          expiresAt: true,
          usedAt: true,
          club: { select: { slug: true, name: true } },
        },
      });
      if (!row) return null;
      const { club, ...invitation } = row;
      return { ...invitation, clubSlug: club.slug, clubName: club.name };
    },

    acceptInvitation: ({ invitationId, userId, now }) =>
      db.$transaction(async (tx) => {
        // The conditional update is what makes the link single-use under concurrency.
        const { count } = await tx.clubInvitation.updateMany({
          where: { id: invitationId, usedAt: null },
          data: { usedAt: now },
        });
        if (count === 0) return false;
        const invitation = await tx.clubInvitation.findUniqueOrThrow({
          where: { id: invitationId },
          select: { clubId: true, role: true },
        });
        await tx.clubMember.upsert({
          where: { clubId_userId: { clubId: invitation.clubId, userId } },
          create: { clubId: invitation.clubId, userId, role: invitation.role },
          update: {},
        });
        return true;
      }),

    async listMembers(clubId) {
      const rows = await db.clubMember.findMany({
        where: { clubId },
        orderBy: { createdAt: "asc" },
        select: { userId: true, role: true, user: { select: { name: true, email: true } } },
      });
      return rows.map(({ user, ...member }) => ({ ...member, ...user }));
    },

    async removeMember(clubId, userId) {
      await db.clubMember.deleteMany({ where: { clubId, userId } });
    },
  };
}
