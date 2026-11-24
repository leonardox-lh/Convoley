import type { PrismaClient } from "@/generated/prisma/client";
import type { EventDetails, EventRepository } from "../application/ports";
import type { NewEvent } from "../domain/event";

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(event: NewEvent): Promise<{ id: string }> {
    return this.db.event.create({ data: event, select: { id: true } });
  }

  async findInClub(clubId: string, eventId: string): Promise<EventDetails | null> {
    const row = await this.db.event.findFirst({
      where: { id: eventId, clubId },
      include: { community: { select: { name: true } } },
    });
    if (!row) return null;
    return {
      id: row.id,
      clubId: row.clubId,
      communityId: row.communityId,
      communityName: row.community.name,
      title: row.title,
      startsAt: row.startsAt,
      venueName: row.venueName,
      mapsUrl: row.mapsUrl,
      priceCents: row.priceCents,
      capacity: row.capacity,
      isMixed: row.isMixed,
      rules: row.rules,
      status: row.status,
    };
  }
}
