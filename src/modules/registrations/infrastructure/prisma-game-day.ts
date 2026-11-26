import { db } from "@/lib/db";
import type { TeamMatches, TeamNames } from "../application/ports";

export const prismaTeamNames: TeamNames = {
  async list(eventId) {
    const rows = await db.teamName.findMany({ where: { eventId } });
    return new Map(rows.map((row) => [row.teamNumber, row.name]));
  },

  async set(eventId, teamNumber, name) {
    if (name === null) {
      await db.teamName.deleteMany({ where: { eventId, teamNumber } });
      return;
    }
    await db.teamName.upsert({
      where: { eventId_teamNumber: { eventId, teamNumber } },
      create: { eventId, teamNumber, name },
      update: { name },
    });
  },
};

const matchFields = {
  id: true,
  position: true,
  isFinal: true,
  homeTeam: true,
  awayTeam: true,
  homeScore: true,
  awayScore: true,
} as const;

export const prismaTeamMatches: TeamMatches = {
  list: (eventId) =>
    db.teamMatch.findMany({
      where: { eventId },
      select: matchFields,
      orderBy: { position: "asc" },
    }),

  replaceAll: (eventId, pairings) =>
    db.$transaction(async (tx) => {
      await tx.teamMatch.deleteMany({ where: { eventId } });
      await tx.teamMatch.createMany({
        data: pairings.map((pairing, index) => ({ eventId, position: index + 1, ...pairing })),
      });
    }),

  async setScore({ eventId, matchId, homeScore, awayScore }) {
    const { count } = await db.teamMatch.updateMany({
      where: { id: matchId, eventId },
      data: { homeScore, awayScore },
    });
    return count === 1;
  },

  setFinal: (eventId, pairing) =>
    db.$transaction(async (tx) => {
      const final = await tx.teamMatch.findFirst({ where: { eventId, isFinal: true } });
      if (final) {
        await tx.teamMatch.update({ where: { id: final.id }, data: pairing });
        return;
      }
      const last = await tx.teamMatch.aggregate({ where: { eventId }, _max: { position: true } });
      await tx.teamMatch.create({
        data: { eventId, isFinal: true, position: (last._max.position ?? 0) + 1, ...pairing },
      });
    }),
};
