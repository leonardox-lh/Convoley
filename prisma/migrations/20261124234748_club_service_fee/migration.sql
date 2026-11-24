-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "serviceFeeFixedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "serviceFeePercentBps" INTEGER NOT NULL DEFAULT 0;

-- HU-22: up to S/ 50 fixed or 20 %, never both at once.
ALTER TABLE "Club" ADD CONSTRAINT "Club_serviceFee_check" CHECK (
  "serviceFeeFixedCents" BETWEEN 0 AND 5000
  AND "serviceFeePercentBps" BETWEEN 0 AND 2000
  AND ("serviceFeeFixedCents" = 0 OR "serviceFeePercentBps" = 0)
);
