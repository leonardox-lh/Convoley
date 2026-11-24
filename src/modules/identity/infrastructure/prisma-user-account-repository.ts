import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { UserAccountRepository } from "../application/ports";
import { EmailAlreadyRegisteredError } from "../domain/errors";

const UNIQUE_VIOLATION = "P2002";

export function prismaUserAccountRepository(db: PrismaClient): UserAccountRepository {
  return {
    async findByEmail(email) {
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email: true, passwordHash: true },
      });
      return user?.email ? { ...user, email: user.email } : null;
    },

    async create(input) {
      try {
        return await db.user.create({ data: input, select: { id: true } });
      } catch (error) {
        // Two sign-ups with the same email at once: the unique index decides.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === UNIQUE_VIOLATION
        ) {
          throw new EmailAlreadyRegisteredError(input.email);
        }
        throw error;
      }
    },
  };
}
