-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "creditCount" INTEGER,
    "validityDays" INTEGER,
    "communityIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Plan_clubId_idx" ON "Plan"("clubId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written constraints (Prisma does not manage CHECKs).
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_priceCents_check" CHECK ("priceCents" > 0);
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_credits_or_validity_check"
  CHECK (num_nonnulls("creditCount", "validityDays") >= 1
    AND ("creditCount" IS NULL OR "creditCount" > 0)
    AND ("validityDays" IS NULL OR "validityDays" > 0));
