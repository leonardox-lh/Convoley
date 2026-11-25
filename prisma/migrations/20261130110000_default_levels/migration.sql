-- Every club gets the default levels it doesn't have yet (General, Básico, Intermedio, Competitivo).
-- Existing names are left alone; the offsets keep that order in lists sorted by creation time.
INSERT INTO "Community" ("id", "clubId", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, club."id", level.name, now() + level.position * interval '1 millisecond', now()
FROM "Club" club
CROSS JOIN (VALUES ('General', 0), ('Básico', 1), ('Intermedio', 2), ('Competitivo', 3)) AS level(name, position)
ON CONFLICT ("clubId", "name") DO NOTHING;
