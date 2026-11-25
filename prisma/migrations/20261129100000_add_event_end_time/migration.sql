-- AlterTable
ALTER TABLE "Event" ADD COLUMN "endsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RecurringEvent" ADD COLUMN "endMinute" INTEGER;
