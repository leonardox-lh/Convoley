import { describe, expect, test } from "vitest";
import {
  NothingToReviewError,
  OrderNotFoundError,
  OrderStatusError,
  OutOfStockError,
} from "../domain/errors";
import { fakeOrderPayments, fakeOrderRepository, fakeTransactions, storedOrder } from "./fakes";
import {
  makeApproveOrderVoucher,
  makeMarkOrderDelivered,
  makeRejectOrderVoucher,
} from "./manage-orders";
import type { StoredOrder } from "./ports";

const review = { clubId: "club-1", orderId: "ord-1", reviewedByUserId: "org-1" };

function setup(order: Partial<StoredOrder> = {}, stock = 3) {
  const orderRepo = fakeOrderRepository({
    orders: [storedOrder(order)],
    variants: [{ variantId: "var-s", priceCents: 4500, stock }],
  });
  const { payments, rows } = fakeOrderPayments(
    order.status === "in_review"
      ? [
          {
            id: "pay-1",
            clubId: "club-1",
            orderId: "ord-1",
            amountCents: 9000,
            status: "in_review",
          },
        ]
      : [],
  );
  rows.forEach((row) => (row.method = "voucher"));
  const deps = {
    orders: orderRepo.repository,
    payments,
    transactions: fakeTransactions,
    now: () => new Date(),
  };
  return {
    approve: makeApproveOrderVoucher(deps),
    reject: makeRejectOrderVoucher(deps),
    deliver: makeMarkOrderDelivered(deps),
    orders: orderRepo.orders,
    variants: orderRepo.variants,
    rows,
  };
}

describe("HU-25: gestionar pedidos (pendiente, pagado, entregado)", () => {
  test("aprobar el voucher deja el pedido pagado y descuenta el stock", async () => {
    const { approve, orders, variants, rows } = setup({ status: "in_review" });
    await approve(review);
    expect(orders[0]!.status).toBe("paid");
    expect(variants[0]!.stock).toBe(1);
    expect(rows[0]!.status).toBe("approved");
  });

  test("sin stock no se puede aprobar: el organizador debe rechazarlo", async () => {
    const { approve, reject, orders } = setup({ status: "in_review" }, 1);
    await expect(approve(review)).rejects.toBeInstanceOf(OutOfStockError);
    await reject({ ...review, reason: "Se agotó, te devolví por Yape" });
    expect(orders[0]!.status).toBe("pending_payment");
  });

  test("sin voucher en revisión no hay nada que aprobar", async () => {
    const { approve } = setup({ status: "pending_payment" });
    await expect(approve(review)).rejects.toBeInstanceOf(NothingToReviewError);
  });
});

describe("HU-25: marcar como entregado", () => {
  test("solo un pedido pagado y del propio club", async () => {
    const { deliver, orders } = setup({ status: "paid" });
    await expect(deliver({ clubId: "otro", orderId: "ord-1" })).rejects.toBeInstanceOf(
      OrderNotFoundError,
    );
    await deliver({ clubId: "club-1", orderId: "ord-1" });
    expect(orders[0]!.status).toBe("delivered");
    await expect(deliver({ clubId: "club-1", orderId: "ord-1" })).rejects.toBeInstanceOf(
      OrderStatusError,
    );
  });
});
