-- CreateTable
CREATE TABLE "TeamName" (
    "eventId" TEXT NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeamName_pkey" PRIMARY KEY ("eventId","teamNumber")
);

-- CreateTable
CREATE TABLE "TeamMatch" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "homeTeam" INTEGER NOT NULL,
    "awayTeam" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,

    CONSTRAINT "TeamMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMatch_eventId_position_key" ON "TeamMatch"("eventId", "position");

-- AddForeignKey
ALTER TABLE "TeamName" ADD CONSTRAINT "TeamName_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMatch" ADD CONSTRAINT "TeamMatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
