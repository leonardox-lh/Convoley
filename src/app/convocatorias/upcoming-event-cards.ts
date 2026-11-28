import { clubLogoPath, findClubNamesByIds } from "@/modules/clubs";
import { listUpcomingEvents } from "@/modules/events";
import type { UpcomingEventCardData } from "../upcoming-event-card";

/**
 * One page of upcoming events as cards. Asks for one extra to know whether another page
 * follows, so `hasMore` never needs a count query.
 */
export async function loadUpcomingEventCards(
  limit: number,
  offset = 0,
): Promise<{ cards: UpcomingEventCardData[]; hasMore: boolean }> {
  const fetched = await listUpcomingEvents(limit + 1, offset);
  const events = fetched.slice(0, limit);
  const clubs = new Map(
    (await findClubNamesByIds([...new Set(events.map((e) => e.clubId))])).map((c) => [c.id, c]),
  );
  const cards = events.flatMap((event) => {
    const club = clubs.get(event.clubId);
    if (!club) return [];
    return [
      {
        id: event.id,
        href: `/c/${club.slug}/${event.id}`,
        title: event.title,
        clubName: club.name,
        clubLogoUrl: club.logoKey ? clubLogoPath(club.logoKey) : null,
        startsAt: event.startsAt,
        endsAt: event.endsAt ?? null,
        remainingSpots: event.remainingSpots,
        venueName: event.venueName,
        priceCents: event.priceCents,
      },
    ];
  });
  return { cards, hasMore: fetched.length > limit };
}
