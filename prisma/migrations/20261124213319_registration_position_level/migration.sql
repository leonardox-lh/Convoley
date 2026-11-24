-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('setter', 'libero', 'outside_hitter', 'middle_blocker', 'opposite', 'any');

-- CreateEnum
CREATE TYPE "PlayerLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "level" "PlayerLevel",
ADD COLUMN     "position" "PlayerPosition";
