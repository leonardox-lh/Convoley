import type { PrismaClient } from "@/generated/prisma/client";
import type { PasswordResetTokenRepository } from "../application/ports";

export function prismaPasswordResetTokenRepository(db: PrismaClient): PasswordResetTokenRepository {
  return {
    async replaceForUser({ userId, tokenHash, expiresAt }) {
      await db.$transaction([
        db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
        db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
      ]);
    },

    findByHash(tokenHash) {
      return db.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });
    },

    consume({ tokenId, userId, passwordHash, at }) {
      return db.$transaction(async (tx) => {
        // Conditional update: of two simultaneous requests with the same link, only one wins.
        const { count } = await tx.passwordResetToken.updateMany({
          where: { id: tokenId, usedAt: null },
          data: { usedAt: at },
        });
        if (count !== 1) return false;
        await tx.user.update({ where: { id: userId }, data: { passwordHash } });
        return true;
      });
    },
  };
}
