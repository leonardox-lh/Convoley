-- Prisma doesn't manage CHECKs: kept by hand like the other *_range_checks.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_serviceFeeCents_check" CHECK ("serviceFeeCents" >= 0);
