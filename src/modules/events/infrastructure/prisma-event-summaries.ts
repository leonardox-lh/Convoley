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
    },
  });
  const clubs = new Map(
    (await findClubNamesByIds([...new Set(events.map((event) => event.clubId))])).map((club) => [
      club.id,
      club,
    ]),
  );
  return events.map(({ clubId, ...event }) => ({
    ...event,
    clubSlug: clubs.get(clubId)?.slug ?? "",
    clubName: clubs.get(clubId)?.name ?? "",
  }));
}
