-- Stock left empty or written as text ("A pedido") isn't tracked: the variant never runs out.
ALTER TABLE "Product" ADD COLUMN "stockNote" TEXT;
ALTER TABLE "ProductVariant" ALTER COLUMN "stock" DROP NOT NULL;
