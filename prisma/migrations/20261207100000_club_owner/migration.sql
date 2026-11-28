-- A user owns at most one club. Existing clubs get their first admin as owner,
-- unless that admin already owns an older club (then the club stays without owner).
ALTER TABLE "Club" ADD COLUMN "ownerUserId" TEXT;

UPDATE "Club" c
SET "ownerUserId" = first_admin."userId"
FROM (
  SELECT DISTINCT ON (m."userId") m."clubId", m."userId"
  FROM (
    SELECT DISTINCT ON ("clubId") "clubId", "userId", "createdAt"
    FROM "ClubMember"
    WHERE "role" = 'admin'
    ORDER BY "clubId", "createdAt"
  ) m
  ORDER BY m."userId", m."createdAt"
) first_admin
WHERE c."id" = first_admin."clubId";

CREATE UNIQUE INDEX "Club_ownerUserId_key" ON "Club"("ownerUserId");
