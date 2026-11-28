import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { OrderRepository, TransactionContext, TransactionRunner } from "../application/ports";
import type { OrderStatus } from "../domain/order";

export function prismaTransactions(db: PrismaClient): TransactionRunner {
  return { run: (work) => db.$transaction((tx) => work(tx as unknown as TransactionContext)) };
}

/** The Prisma client behind a TransactionContext created by prismaTransactions. */
export function toPrismaTx(tx: TransactionContext): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}

const ITEM_FIELDS = { variantId: true, quantity: true, unitPriceCents: true } as const;

export function prismaOrderRepository(db: PrismaClient): OrderRepository {
  return {
    async sellableVariants(clubId, variantIds) {
      const rows = await db.productVariant.findMany({
        where: { id: { in: variantIds }, product: { clubId, isActive: true } },
        select: { id: true, stock: true, product: { select: { priceCents: true } } },
      });
      return rows.map((row) => ({
        variantId: row.id,
        stock: row.stock,
        priceCents: row.product.priceCents,
      }));
    },

    create: ({ buyer, items, ...order }) =>
      db.order.create({
        data: { ...order, ...buyer, items: { create: items } },
        select: { id: true },
      }),

    async lock(orderId, tx) {
      const client = toPrismaTx(tx);
      await client.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      return client.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          clubId: true,
          status: true,
          totalCents: true,
          items: { select: ITEM_FIELDS },
        },
      });
    },

    async setStatus(orderId, status, tx) {
      await toPrismaTx(tx).order.update({ where: { id: orderId }, data: { status } });
    },

    async lockStock(variantIds, tx) {
      // Always in id order: two orders sharing sizes lock them the same way and never deadlock.
      const rows = await toPrismaTx(tx).$queryRaw<{ id: string; stock: number | null }[]>`
        SELECT id, stock FROM "ProductVariant" WHERE id = ANY(${variantIds}) ORDER BY id FOR UPDATE`;
      return new Map(rows.map((row) => [row.id, row.stock]));
    },

    async takeStock(items, tx) {
      for (const item of items) {
        // Untracked stock (null) is left as it is.
        await toPrismaTx(tx).productVariant.updateMany({
          where: { id: item.variantId, stock: { not: null } },
          data: { stock: { decrement: item.quantity } },
        });
      }
    },
  };
}

export interface OrderListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: OrderStatus;
  totalCents: number;
  pickupEventId: string;
  createdAt: Date;
  items: { quantity: number; size: string | null; productName: string }[];
}

/** An order with what it contains, for the player's page and the organizer's list. */
export async function findOrders(
  db: PrismaClient,
  where: { id?: string; clubId?: string; status?: { in: OrderStatus[] } },
): Promise<(OrderListItem & { clubId: string })[]> {
  const rows = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      clubId: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      totalCents: true,
      pickupEventId: true,
      createdAt: true,
      items: {
        select: {
          quantity: true,
          variant: { select: { size: true, product: { select: { name: true } } } },
        },
      },
    },
  });
  return rows.map(({ items, ...order }) => ({
    ...order,
    items: items.map((item) => ({
      quantity: item.quantity,
      size: item.variant.size,
      productName: item.variant.product.name,
    })),
  }));
}
