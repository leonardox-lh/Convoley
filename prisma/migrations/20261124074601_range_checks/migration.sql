-- Hand-written range constraints for money, capacity and stock (Prisma does not manage CHECKs).
ALTER TABLE "Event" ADD CONSTRAINT "Event_priceCents_check" CHECK ("priceCents" >= 0);
ALTER TABLE "Event" ADD CONSTRAINT "Event_capacity_check" CHECK ("capacity" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amountCents_check" CHECK ("amountCents" > 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_priceCents_check" CHECK ("priceCents" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_check" CHECK ("stock" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_totalCents_check" CHECK ("totalCents" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_unitPriceCents_check" CHECK ("unitPriceCents" >= 0);
