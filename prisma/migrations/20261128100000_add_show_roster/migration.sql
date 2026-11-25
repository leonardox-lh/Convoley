-- AlterTable
ALTER TABLE "Event" ADD COLUMN "showRoster" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RecurringEvent" ADD COLUMN "showRoster" BOOLEAN NOT NULL DEFAULT false;
