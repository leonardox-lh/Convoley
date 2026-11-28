import type { PrismaClient } from "@/generated/prisma/client";
import type { VenueBook } from "../application/ports";

export function prismaVenueBook(db: PrismaClient): VenueBook {
  return {
    async remember(clubId, { name, mapsUrl }) {
      const venueName = name.trim();
      const lastUsedAt = new Date();
      await db.venue.upsert({
        where: { clubId_name: { clubId, name: venueName } },
        create: { clubId, name: venueName, mapsUrl, lastUsedAt },
        // An event saved without a link doesn't erase the one the list already has.
        update: { lastUsedAt, ...(mapsUrl ? { mapsUrl } : {}) },
      });
    },
    listInClub(clubId) {
      return db.venue.findMany({
        where: { clubId },
        orderBy: { lastUsedAt: "desc" },
        select: { id: true, name: true, mapsUrl: true },
      });
    },
    async remove(clubId, venueId) {
      await db.venue.deleteMany({ where: { id: venueId, clubId } });
    },
  };
}
