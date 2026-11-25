-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "courtCostCents" INTEGER;


-- Range check (written by hand)
ALTER TABLE "Event" ADD CONSTRAINT "Event_courtCostCents_check" CHECK ("courtCostCents" IS NULL OR "courtCostCents" >= 0);
