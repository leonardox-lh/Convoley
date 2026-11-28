import type { PrismaClient } from "@/generated/prisma/client";
import type { ProductRepository, StoredProduct } from "../application/ports";

const PRODUCT_FIELDS = {
  id: true,
  clubId: true,
  name: true,
  description: true,
  priceCents: true,
  imageKeys: true,
  isActive: true,
  stockNote: true,
  variants: { select: { id: true, size: true, stock: true }, orderBy: { id: "asc" } },
} as const;

export function prismaProductRepository(db: PrismaClient): ProductRepository {
  return {
    create: (clubId, { variants, ...product }) =>
      db.product.create({
        data: { clubId, ...product, variants: { create: variants } },
        select: { id: true },
      }),

    find: (clubId, id) => db.product.findFirst({ where: { id, clubId }, select: PRODUCT_FIELDS }),

    update: (productId, { variants, ...product }, keepStockOf) =>
      db.$transaction(async (tx) => {
        await tx.product.update({ where: { id: productId }, data: product });
        // Locked in id order, like orders taking stock, so a sale can't slip in between.
        const existing = await tx.$queryRaw<{ id: string; size: string | null }[]>`
          SELECT id, size FROM "ProductVariant" WHERE "productId" = ${productId}
          ORDER BY id FOR UPDATE`;
        for (const variant of variants) {
          const match = existing.find((row) => row.size === variant.size);
          if (match && keepStockOf.includes(variant.size)) continue;
          if (match) {
            await tx.productVariant.update({
              where: { id: match.id },
              data: { stock: variant.stock },
            });
          } else {
            await tx.productVariant.create({ data: { productId, ...variant } });
          }
        }
        const dropped = existing.filter((row) => !variants.some((v) => v.size === row.size));
        await tx.productVariant.updateMany({
          where: { id: { in: dropped.map((row) => row.id) } },
          data: { stock: 0 },
        });
      }),

    async appendImageKey(productId, key, max) {
      // A new product's imageKeys is NULL, not '{}': without coalesce its first photo looked "full".
      const updated = await db.$executeRaw`
        UPDATE "Product" SET "imageKeys" = array_append("imageKeys", ${key}), "updatedAt" = now()
        WHERE id = ${productId} AND coalesce(cardinality("imageKeys"), 0) < ${max}`;
      return updated === 1;
    },

    async removeImageKey(productId, key) {
      await db.$executeRaw`
        UPDATE "Product" SET "imageKeys" = array_remove("imageKeys", ${key}), "updatedAt" = now()
        WHERE id = ${productId}`;
    },

    async setActive(productId, isActive) {
      await db.product.update({ where: { id: productId }, data: { isActive } });
    },
  };
}

/** The club's products, newest first; the public catalog asks only for active ones. */
export function listClubProducts(
  db: PrismaClient,
  clubId: string,
  options: { onlyActive: boolean },
): Promise<StoredProduct[]> {
  return db.product.findMany({
    where: { clubId, ...(options.onlyActive && { isActive: true }) },
    orderBy: { createdAt: "desc" },
    select: PRODUCT_FIELDS,
  });
}
