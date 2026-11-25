-- CreateTable
CREATE TABLE "Subscription" (
    "clubId" TEXT NOT NULL,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "paidUntil" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("clubId")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidUntil" TIMESTAMP(3) NOT NULL,
    "recordedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionPayment_clubId_createdAt_idx" ON "SubscriptionPayment"("clubId", "createdAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Subscription"("clubId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Checks and backfill (written by hand)
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_amountCents_check" CHECK ("amountCents" > 0);

-- Existing clubs get the 30-day free trial from the deploy.
INSERT INTO "Subscription" ("clubId", "trialEndsAt", "createdAt", "updatedAt")
SELECT "id", now() + interval '30 days', now(), now() FROM "Club";
