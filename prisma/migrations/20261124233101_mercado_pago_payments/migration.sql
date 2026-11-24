-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'refund_pending';
ALTER TYPE "PaymentStatus" ADD VALUE 'refunded';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerStatusDetail" TEXT,
ADD COLUMN     "serviceFeeCents" INTEGER NOT NULL DEFAULT 0;
