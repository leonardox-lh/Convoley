-- CreateEnum
CREATE TYPE "PaymentApp" AS ENUM ('yape', 'plin');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN "paymentApp" "PaymentApp";
