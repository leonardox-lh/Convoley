-- The club's own list of courts.
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Venue_clubId_name_key" ON "Venue"("clubId", "name");

ALTER TABLE "Venue" ADD CONSTRAINT "Venue_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Start every club's list with the places it already played at, latest link and date first.
INSERT INTO "Venue" ("id", "clubId", "name", "mapsUrl", "lastUsedAt")
SELECT DISTINCT ON ("clubId", "venueName")
    gen_random_uuid()::text, "clubId", "venueName", "mapsUrl", "startsAt"
FROM "Event"
ORDER BY "clubId", "venueName", "startsAt" DESC;
