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

    update: (productId, { variants, ...product }) =>
      db.$transaction(async (tx) => {
        await tx.product.update({ where: { id: productId }, data: product });
        const existing = await tx.productVariant.findMany({ where: { productId } });
        for (const variant of variants) {
          const match = existing.find((row) => row.size === variant.size);
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
      const updated = await db.$executeRaw`
        UPDATE "Product" SET "imageKeys" = array_append("imageKeys", ${key}), "updatedAt" = now()
        WHERE id = ${productId} AND cardinality("imageKeys") < ${max}`;
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
