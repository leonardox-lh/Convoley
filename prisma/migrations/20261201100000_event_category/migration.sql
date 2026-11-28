-- Mixed / men only / women only. Every existing event and template becomes mixed, the most common.
CREATE TYPE "EventCategory" AS ENUM ('mixed', 'men', 'women');

ALTER TABLE "Event" ADD COLUMN "category" "EventCategory" NOT NULL DEFAULT 'mixed';
ALTER TABLE "Event" DROP COLUMN "isMixed";

ALTER TABLE "RecurringEvent" ADD COLUMN "category" "EventCategory" NOT NULL DEFAULT 'mixed';
ALTER TABLE "RecurringEvent" DROP COLUMN "isMixed";
