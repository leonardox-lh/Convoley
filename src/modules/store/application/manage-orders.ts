import { inStock } from "../domain/cart";
import {
  NothingToReviewError,
  OrderNotFoundError,
  OrderStatusError,
  OutOfStockError,
} from "../domain/errors";
import type {
  OrderPayments,
  OrderRepository,
  TransactionContext,
  TransactionRunner,
} from "./ports";

interface Deps {
  orders: OrderRepository;
  payments: OrderPayments;
  transactions: TransactionRunner;
  now: () => Date;
}

export interface ReviewOrderInput {
  clubId: string;
  orderId: string;
  reviewedByUserId: string;
}

/** Locks an order of the club; another club's order is "not found". */
async function lockClubOrder(deps: Deps, clubId: string, orderId: string, tx: TransactionContext) {
  const order = await deps.orders.lock(orderId, tx);
  if (!order || order.clubId !== clubId) throw new OrderNotFoundError(orderId);
  return order;
}

async function voucherToReview(deps: Deps, input: ReviewOrderInput, tx: TransactionContext) {
  const order = await lockClubOrder(deps, input.clubId, input.orderId, tx);
  const voucher =
    order.status === "in_review" ? await deps.payments.findVoucherInReview(order.id, tx) : null;
  if (!voucher) throw new NothingToReviewError(order.id);
  return { order, voucher };
}

/**
 * HU-25: the organizer approves the voucher and the order is paid; its stock is taken now
 * (HU-23). If the stock ran out meanwhile it can't be approved: Convoley never moves money, so
 * the organizer rejects it and returns the money by Yape.
 */
export function makeApproveOrderVoucher(deps: Deps) {
  return async function approveOrderVoucher(input: ReviewOrderInput) {
    await deps.transactions.run(async (tx) => {
      const { order, voucher } = await voucherToReview(deps, input, tx);
      const stock = await deps.orders.lockStock(
        order.items.map((item) => item.variantId),
        tx,
      );
      if (!inStock(order.items, stock)) throw new OutOfStockError(order.id);
      await deps.payments.approveVoucher(
        { paymentId: voucher.id, reviewedByUserId: input.reviewedByUserId, at: deps.now() },
        tx,
      );
      await deps.orders.takeStock(order.items, tx);
      await deps.orders.setStatus(order.id, "paid", tx);
    });
  };
}

/**
 * Rejected with a reason the player sees (validated by the caller, like HU-15); the order waits
 * for a new payment.
 */
export function makeRejectOrderVoucher(deps: Deps) {
  return async function rejectOrderVoucher(input: ReviewOrderInput & { reason: string }) {
    await deps.transactions.run(async (tx) => {
      const { order, voucher } = await voucherToReview(deps, input, tx);
      await deps.payments.rejectVoucher(
        {
          paymentId: voucher.id,
          reason: input.reason,
          reviewedByUserId: input.reviewedByUserId,
          at: deps.now(),
        },
        tx,
      );
      await deps.orders.setStatus(order.id, "pending_payment", tx);
    });
  };
}

/** HU-25: the player picked up a paid order. */
export function makeMarkOrderDelivered(deps: Pick<Deps, "orders" | "transactions">) {
  return async function markOrderDelivered(input: { clubId: string; orderId: string }) {
    await deps.transactions.run(async (tx) => {
      const order = await deps.orders.lock(input.orderId, tx);
      if (!order || order.clubId !== input.clubId) throw new OrderNotFoundError(input.orderId);
      if (order.status !== "paid") throw new OrderStatusError(order.id, order.status);
      await deps.orders.setStatus(order.id, "delivered", tx);
    });
  };
}
