import {
  Prisma,
  type PlayerGender,
  type PlayerLevel,
  type PlayerPosition,
  type PrismaClient,
} from "@/generated/prisma/client";
import type { PlayerProfileRepository } from "../application/ports";
import { PhoneLinkedToAnotherAccountError } from "../domain/errors";

const UNIQUE_VIOLATION = "P2002";

export function prismaPlayerProfileRepository(db: PrismaClient): PlayerProfileRepository {
  return {
    async find(userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          name: true,
          phone: true,
          position: true,
          level: true,
          gender: true,
        },
      });
      if (!user) return null;
      // Accounts created before HU-48 only have the full name.
      const [first = "", ...rest] = (user.name ?? "").split(" ");
      return {
        firstName: user.firstName ?? first,
        lastName: user.lastName ?? rest.join(" "),
        phone: user.phone,
        position: user.position,
        level: user.level,
        gender: user.gender,
      };
    },

    async setPhone(userId, phone) {
      await updateUser(db, userId, { phone });
    },

    async update(userId, { firstName, lastName, phone, position, level, gender }) {
      // `name` is what organizers see in lists; keep it in sync with the edited parts.
      const name = [firstName, lastName].filter(Boolean).join(" ");
      // The app layer validates these against the same enums before calling.
      await updateUser(db, userId, {
        firstName,
        lastName,
        name,
        phone,
        position: position as PlayerPosition | null,
        level: level as PlayerLevel | null,
        gender: gender as PlayerGender | null,
      });
    },
  };
}

async function updateUser(db: PrismaClient, userId: string, data: Prisma.UserUpdateInput) {
  try {
    await db.user.update({ where: { id: userId }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
      throw new PhoneLinkedToAnotherAccountError();
    }
    throw error;
  }
}
