-- CreateEnum
CREATE TYPE "PlanPurchaseStatus" AS ENUM ('pending_payment', 'in_review', 'active');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "planPurchaseId" TEXT;

-- CreateTable
CREATE TABLE "PlanPurchase" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "PlanPurchaseStatus" NOT NULL DEFAULT 'pending_payment',
    "creditsRemaining" INTEGER,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditUse" (
    "id" TEXT NOT NULL,
    "planPurchaseId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanPurchase_clubId_phone_idx" ON "PlanPurchase"("clubId", "phone");

-- CreateIndex
CREATE INDEX "PlanPurchase_userId_idx" ON "PlanPurchase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditUse_registrationId_key" ON "CreditUse"("registrationId");

-- CreateIndex
CREATE INDEX "CreditUse_planPurchaseId_idx" ON "CreditUse"("planPurchaseId");

-- CreateIndex
CREATE INDEX "Payment_planPurchaseId_idx" ON "Payment"("planPurchaseId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planPurchaseId_fkey" FOREIGN KEY ("planPurchaseId") REFERENCES "PlanPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPurchase" ADD CONSTRAINT "PlanPurchase_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPurchase" ADD CONSTRAINT "PlanPurchase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPurchase" ADD CONSTRAINT "PlanPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditUse" ADD CONSTRAINT "CreditUse_planPurchaseId_fkey" FOREIGN KEY ("planPurchaseId") REFERENCES "PlanPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditUse" ADD CONSTRAINT "CreditUse_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written constraints (Prisma does not manage CHECKs).
-- A payment belongs to exactly one registration, order or plan purchase.
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_registration_xor_order_check";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_single_owner_check"
  CHECK (num_nonnulls("registrationId", "orderId", "planPurchaseId") = 1);
ALTER TABLE "PlanPurchase" ADD CONSTRAINT "PlanPurchase_phone_format_check"
  CHECK ("phone" ~ '^\+519[0-9]{8}$');
ALTER TABLE "PlanPurchase" ADD CONSTRAINT "PlanPurchase_creditsRemaining_check"
  CHECK ("creditsRemaining" IS NULL OR "creditsRemaining" >= 0);
