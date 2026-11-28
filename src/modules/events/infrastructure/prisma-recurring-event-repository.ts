import type { PrismaClient } from "@/generated/prisma/client";
import type { RecurringEventRepository } from "../application/ports";
import { occurrenceEndsAt } from "../domain/recurrence";

export function prismaRecurringEventRepository(db: PrismaClient): RecurringEventRepository {
  return {
    create: (template) => db.recurringEvent.create({ data: template, select: { id: true } }),

    async listInClub(clubId) {
      const rows = await db.recurringEvent.findMany({
        where: { clubId },
        orderBy: { createdAt: "desc" },
        omit: { createdAt: true, updatedAt: true },
        include: { community: { select: { name: true } } },
      });
      return rows.map(({ community, ...template }) => ({
        ...template,
        communityName: community.name,
      }));
    },

    async setPaused(clubId, recurringEventId, isPaused) {
      const { count } = await db.recurringEvent.updateMany({
        where: { id: recurringEventId, clubId },
        data: { isPaused },
      });
      return count > 0;
    },

    async publishOccurrences(template, slots) {
      // ON CONFLICT DO NOTHING on (recurringEventId, recurringSlot): concurrent page views and
      // dates the organizer cancelled or moved are never created again.
      await db.event.createMany({
        data: slots.map((slot) => ({
          clubId: template.clubId,
          communityId: template.communityId,
          title: template.title,
          venueName: template.venueName,
          mapsUrl: template.mapsUrl,
          priceCents: template.priceCents,
          capacity: template.capacity,
          category: template.category,
          showRoster: template.showRoster,
          rules: template.rules,
          startsAt: slot,
          endsAt: occurrenceEndsAt(template, slot),
          status: "published" as const,
          recurringEventId: template.id,
          recurringSlot: slot,
        })),
        skipDuplicates: true,
      });
    },
  };
}
