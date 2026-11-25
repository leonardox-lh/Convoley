export const ORDER_STATUSES = [
  "pending_payment",
  "in_review",
  "paid",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** A Mercado Pago charge as we read it. */
export type ChargeResult = "approved" | "rejected" | "pending";

export type StoredPaymentStatus =
  "pending" | "in_review" | "approved" | "rejected" | "refund_pending" | "refunded";

export type OrderSettlement =
  | "ignore"
  | "keep_pending"
  | "mark_rejected"
  | "mark_paid"
  | "out_of_stock_refund"
  | "refund"
  | "retry_refund";

const FINAL_PAYMENT_STATUSES: StoredPaymentStatus[] = ["approved", "rejected", "refunded"];
const AWAITING_PAYMENT: OrderStatus[] = ["pending_payment", "in_review"];

/**
 * What to do with Mercado Pago's answer for an order (HU-24). Idempotent: a settled payment is
 * ignored. The stock is taken only now, when the money arrives; if it ran out in the meantime,
 * the order is cancelled and the money goes back. Paid twice: the second payment goes back.
 */
export function orderSettlement(input: {
  charge: ChargeResult;
  paymentStatus: StoredPaymentStatus;
  orderStatus: OrderStatus;
  inStock: boolean;
}): OrderSettlement {
  if (FINAL_PAYMENT_STATUSES.includes(input.paymentStatus)) return "ignore";
  if (input.paymentStatus === "refund_pending") return "retry_refund";
  if (input.charge === "pending") return "keep_pending";
  if (input.charge === "rejected") return "mark_rejected";
  if (!AWAITING_PAYMENT.includes(input.orderStatus)) return "refund";
  return input.inStock ? "mark_paid" : "out_of_stock_refund";
}

/** HU-25: the organizer's filters; "pending" gathers unpaid orders and those under review. */
export const ORDER_FILTERS = {
  pending: ["pending_payment", "in_review"],
  paid: ["paid"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
} as const satisfies Record<string, readonly OrderStatus[]>;
export type OrderFilter = keyof typeof ORDER_FILTERS;
