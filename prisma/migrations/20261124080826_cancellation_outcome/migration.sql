-- CreateEnum
CREATE TYPE "CancellationOutcome" AS ENUM ('refund', 'balance');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "cancellationOutcome" "CancellationOutcome";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cancellationOutcome" "CancellationOutcome";
