-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "cancellationDeadlineHours" INTEGER;

-- CreateTable
CREATE TABLE "PlayerBalance" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceUse" (
    "id" TEXT NOT NULL,
    "playerBalanceId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBalance_clubId_userId_key" ON "PlayerBalance"("clubId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceUse_registrationId_key" ON "BalanceUse"("registrationId");

-- CreateIndex
CREATE INDEX "BalanceUse_playerBalanceId_idx" ON "BalanceUse"("playerBalanceId");

-- AddForeignKey
ALTER TABLE "PlayerBalance" ADD CONSTRAINT "PlayerBalance_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerBalance" ADD CONSTRAINT "PlayerBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceUse" ADD CONSTRAINT "BalanceUse_playerBalanceId_fkey" FOREIGN KEY ("playerBalanceId") REFERENCES "PlayerBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceUse" ADD CONSTRAINT "BalanceUse_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Range checks (written by hand)
ALTER TABLE "Club" ADD CONSTRAINT "Club_cancellationDeadlineHours_check" CHECK ("cancellationDeadlineHours" IS NULL OR "cancellationDeadlineHours" BETWEEN 0 AND 168);
ALTER TABLE "PlayerBalance" ADD CONSTRAINT "PlayerBalance_balanceCents_check" CHECK ("balanceCents" >= 0);
ALTER TABLE "BalanceUse" ADD CONSTRAINT "BalanceUse_amountCents_check" CHECK ("amountCents" > 0);
