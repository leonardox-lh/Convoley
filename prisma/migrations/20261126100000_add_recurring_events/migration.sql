-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurringEventId" TEXT,
ADD COLUMN     "recurringSlot" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RecurringEvent" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "venueName" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "priceCents" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isMixed" BOOLEAN NOT NULL DEFAULT false,
    "rules" TEXT,
    "publishDaysBefore" INTEGER NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringEvent_clubId_idx" ON "RecurringEvent"("clubId");

-- CreateIndex
CREATE INDEX "RecurringEvent_communityId_idx" ON "RecurringEvent"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_recurringEventId_recurringSlot_key" ON "Event"("recurringEventId", "recurringSlot");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_recurringEventId_fkey" FOREIGN KEY ("recurringEventId") REFERENCES "RecurringEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringEvent" ADD CONSTRAINT "RecurringEvent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringEvent" ADD CONSTRAINT "RecurringEvent_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Range checks (written by hand, like range_checks)
ALTER TABLE "RecurringEvent" ADD CONSTRAINT "RecurringEvent_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6);
ALTER TABLE "RecurringEvent" ADD CONSTRAINT "RecurringEvent_startMinute_check" CHECK ("startMinute" BETWEEN 0 AND 1439);
ALTER TABLE "RecurringEvent" ADD CONSTRAINT "RecurringEvent_publishDaysBefore_check" CHECK ("publishDaysBefore" BETWEEN 0 AND 13);
ALTER TABLE "RecurringEvent" ADD CONSTRAINT "RecurringEvent_priceCents_check" CHECK ("priceCents" >= 0);
ALTER TABLE "RecurringEvent" ADD CONSTRAINT "RecurringEvent_capacity_check" CHECK ("capacity" > 0);
ALTER TABLE "Event" ADD CONSTRAINT "Event_recurring_slot_check" CHECK (("recurringEventId" IS NULL) = ("recurringSlot" IS NULL));
