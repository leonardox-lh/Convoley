-- CreateEnum
CREATE TYPE "PlayerGender" AS ENUM ('female', 'male');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "gender" "PlayerGender",
ADD COLUMN     "teamNumber" INTEGER;


-- Range check (written by hand)
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_teamNumber_check" CHECK ("teamNumber" IS NULL OR "teamNumber" BETWEEN 1 AND 8);
