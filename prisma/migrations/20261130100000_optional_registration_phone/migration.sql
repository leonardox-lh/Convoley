-- A first name is enough to sign up: the phone becomes optional.
-- The unique (eventId, phone) index still applies when given; PostgreSQL lets NULLs repeat.
ALTER TABLE "Registration" ALTER COLUMN "phone" DROP NOT NULL;
