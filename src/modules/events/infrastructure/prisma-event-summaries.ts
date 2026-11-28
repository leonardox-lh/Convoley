import type { CourtCostWriter } from "../application/ports";
import { findClubNamesByIds } from "@/modules/clubs";
import { db } from "@/lib/db";

/** Title, date and club of several events, for lists outside one club (HU-48). */
export async function listEventSummaries(eventIds: string[]) {
  const events = await db.event.findMany({
    where: { id: { in: eventIds } },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      priceCents: true,
      clubId: true,
      communityId: true,
      category: true,
    },
  });
  const clubs = new Map(
    (await findClubNamesByIds([...new Set(events.map((event) => event.clubId))])).map((club) => [
      club.id,
      club,
    ]),
  );
  return events.map((event) => ({
    ...event,
    clubSlug: clubs.get(event.clubId)?.slug ?? "",
    clubName: clubs.get(event.clubId)?.name ?? "",
    clubLogoKey: clubs.get(event.clubId)?.logoKey ?? null,
  }));
}

/** HU-36: published or cancelled events of every club that start in [from, to). */
export function listEventsStartingBetween(from: Date, to: Date) {
  return db.event.findMany({
    where: { startsAt: { gte: from, lt: to }, status: { not: "draft" } },
    select: { id: true, clubId: true },
  });
}

export const prismaCourtCostWriter: CourtCostWriter = {
  async set(clubId, eventId, courtCostCents) {
    const { count } = await db.event.updateMany({
      where: { id: eventId, clubId },
      data: { courtCostCents },
    });
    return count > 0;
  },
};

/** HU-34: the club's non-draft events starting in [from, to), for the finance panel. */
export function listClubEventsForFinance(input: { clubId: string; from: Date; to: Date }) {
  return db.event.findMany({
    where: {
      clubId: input.clubId,
      startsAt: { gte: input.from, lt: input.to },
      status: { not: "draft" },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      courtCostCents: true,
    },
  });
}
