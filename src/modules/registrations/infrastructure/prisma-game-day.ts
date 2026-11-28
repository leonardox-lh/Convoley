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

  add: (eventId, pairing, isFinal) =>
    db.$transaction(async (tx) => {
      const last = await tx.teamMatch.aggregate({ where: { eventId }, _max: { position: true } });
      const next = (last._max.position ?? 0) + 1;
      const final = isFinal
        ? null
        : await tx.teamMatch.findFirst({ where: { eventId, isFinal: true } });
      if (!final) {
        await tx.teamMatch.create({ data: { eventId, isFinal, position: next, ...pairing } });
        return;
      }
      // The final moves one place down and the new match takes its spot.
      await tx.teamMatch.update({ where: { id: final.id }, data: { position: next } });
      await tx.teamMatch.create({
        data: { eventId, isFinal: false, position: final.position, ...pairing },
      });
    }),

  async setTeams(matchId, pairing) {
    await db.teamMatch.update({ where: { id: matchId }, data: pairing });
  },

  async remove(matchId) {
    await db.teamMatch.delete({ where: { id: matchId } });
  },

  swapPositions: (first, second) =>
    db.$transaction(async (tx) => {
      // (eventId, position) is unique: park the first match on a free spot while swapping.
      const parked = -first.position;
      await tx.teamMatch.update({ where: { id: first.id }, data: { position: parked } });
      await tx.teamMatch.update({ where: { id: second.id }, data: { position: first.position } });
      await tx.teamMatch.update({ where: { id: first.id }, data: { position: second.position } });
    }),

  async championPhotoKey(eventId) {
    const final = await db.teamMatch.findFirst({
      where: { eventId, isFinal: true },
      select: { championPhotoKey: true },
    });
    return final?.championPhotoKey ?? null;
  },

  async setChampionPhotoKey(eventId, key) {
    await db.teamMatch.updateMany({
      where: { eventId, isFinal: true },
      data: { championPhotoKey: key },
    });
  },
};
