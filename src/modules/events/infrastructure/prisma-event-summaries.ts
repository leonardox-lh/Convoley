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
      status: true,
      priceCents: true,
      clubId: true,
      communityId: true,
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
  }));
}

/** HU-36: published or cancelled events of every club that start in [from, to). */
export function listEventsStartingBetween(from: Date, to: Date) {
  return db.event.findMany({
    where: { startsAt: { gte: from, lt: to }, status: { not: "draft" } },
    select: { id: true, clubId: true },
  });
}
