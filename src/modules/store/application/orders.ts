import { inStock, orderTotalCents, validateCart, type CartLine } from "../domain/cart";
import {
  InvalidCartError,
  MercadoPagoUnavailableError,
  OrderNotFoundError,
  OrderStatusError,
  PickupEventNotAvailableError,
} from "../domain/errors";
import { orderSettlement, type OrderSettlement } from "../domain/order";
import type {
  Buyer,
  ChargeReport,
  MercadoPagoGateway,
  OrderPayments,
  OrderRepository,
  PickupEvents,
  ServiceFees,
  StoredOrder,
  TransactionContext,
  TransactionRunner,
} from "./ports";

const PERUVIAN_SOLES = "PEN";
const SETTLEMENTS_THAT_REFUND: OrderSettlement[] = [
  "out_of_stock_refund",
  "refund",
  "retry_refund",
];

/**
 * HU-24: the player orders from the cart and picks it up at one of the club's upcoming events.
 * Prices come from the database and are frozen in the order. The stock is only checked here:
 * it is taken when the payment arrives (HU-23).
 */
export function makeCreateOrder(deps: { orders: OrderRepository; pickupEvents: PickupEvents }) {
  return async function createOrder(input: {
    club: { id: string; slug: string };
    pickupEventId: string;
    buyer: Buyer;
    lines: CartLine[];
  }) {
    const lines = validateCart(input.lines);
    const variants = await deps.orders.sellableVariants(
      input.club.id,
      lines.map((line) => line.variantId),
    );
    if (variants.length !== lines.length) throw new InvalidCartError("unavailable");
    const stock = new Map(variants.map((variant) => [variant.variantId, variant.stock]));
    if (!inStock(lines, stock)) throw new InvalidCartError("out_of_stock");
    if (!(await deps.pickupEvents.isAvailable(input.club.slug, input.pickupEventId))) {
      throw new PickupEventNotAvailableError(input.pickupEventId);
    }

    const items = lines.map((line) => ({
      ...line,
      unitPriceCents: variants.find((variant) => variant.variantId === line.variantId)!.priceCents,
    }));
    return deps.orders.create({
      clubId: input.club.id,
      pickupEventId: input.pickupEventId,
      buyer: input.buyer,
      totalCents: orderTotalCents(items),
      items,
    });
  };
}

async function lockOrder(orders: OrderRepository, orderId: string, tx: TransactionContext) {
  const order = await orders.lock(orderId, tx);
  if (!order) throw new OrderNotFoundError(orderId);
  return order;
}

function assertPendingPayment(order: StoredOrder) {
  if (order.status !== "pending_payment") throw new OrderStatusError(order.id, order.status);
}

/** Locks the order's variants and tells whether there is still stock for all of it. */
async function stockAvailable(orders: OrderRepository, order: StoredOrder, tx: TransactionContext) {
  const stock = await orders.lockStock(
    order.items.map((item) => item.variantId),
    tx,
  );
  return inStock(order.items, stock);
}

interface MercadoPagoDeps {
  orders: OrderRepository;
  gateway: MercadoPagoGateway;
  payments: OrderPayments;
  transactions: TransactionRunner;
}

export type SettleOrderResult = OrderSettlement | "unknown_payment" | "mismatch";

/**
 * Applies Mercado Pago's answer to an order (HU-24), from the charge response or the webhook:
 * whichever comes second changes nothing.
 */
export function makeSettleOrderPayment(deps: MercadoPagoDeps) {
  return async function settleOrderPayment(input: {
    clubId: string;
    report: ChargeReport;
  }): Promise<SettleOrderResult> {
    const { report } = input;
    const payment =
      (await deps.payments.find({ providerPaymentId: report.providerPaymentId })) ??
      (report.externalReference
        ? await deps.payments.find({ id: report.externalReference })
        : null);
    if (!payment?.orderId) return "unknown_payment";
    const matches =
      payment.clubId === input.clubId &&
      payment.amountCents === report.amountCents &&
      report.currency === PERUVIAN_SOLES;
    if (!matches) return "mismatch";
    const orderId = payment.orderId;

    const decision = await deps.transactions.run(async (tx) => {
      const order = await lockOrder(deps.orders, orderId, tx);
      const current = await deps.payments.find({ id: payment.id }, tx);
      if (!current) return "ignore" as const;
      const settlement = orderSettlement({
        charge: report.result,
        paymentStatus: current.status,
        orderStatus: order.status,
        inStock: report.result === "approved" && (await stockAvailable(deps.orders, order, tx)),
      });
      const setPayment = (status: "pending" | "approved" | "rejected" | "refund_pending") =>
        deps.payments.setStatus(
          {
            paymentId: payment.id,
            status,
            statusDetail: report.statusDetail,
            providerPaymentId: report.providerPaymentId,
          },
          tx,
        );

      switch (settlement) {
        case "keep_pending":
          await setPayment("pending");
          break;
        case "mark_rejected":
          await setPayment("rejected");
          break;
        case "mark_paid":
          await setPayment("approved");
          await deps.orders.takeStock(order.items, tx);
          await deps.orders.setStatus(order.id, "paid", tx);
          break;
        case "out_of_stock_refund":
          await setPayment("refund_pending");
          await deps.orders.setStatus(order.id, "cancelled", tx);
          break;
        case "refund":
          await setPayment("refund_pending");
          break;
      }
      return settlement;
    });

    if (SETTLEMENTS_THAT_REFUND.includes(decision)) {
      // Outside the transaction, never holding locks during a network call. If it fails the
      // payment stays refund_pending and Mercado Pago's retry tries again.
      await deps.gateway.refund(input.clubId, report.providerPaymentId, `refund-${payment.id}`);
      await deps.payments.setStatus({
        paymentId: payment.id,
        status: "refunded",
        statusDetail: report.statusDetail,
      });
    }
    return decision;
  };
}

/** The webhook only says "payment X changed": ask Mercado Pago what really happened. */
export function makeSettleOrderNotification(
  deps: MercadoPagoDeps,
  settle: ReturnType<typeof makeSettleOrderPayment>,
) {
  return async function settleOrderNotification(input: {
    providerPaymentId: string;
    mpUserId: string | null;
  }): Promise<SettleOrderResult> {
    const stored = await deps.payments.find({ providerPaymentId: input.providerPaymentId });
    const clubId =
      stored?.clubId ??
      (input.mpUserId ? await deps.gateway.clubIdForAccount(input.mpUserId) : null);
    if (!clubId) return "unknown_payment";
    return settle({ clubId, report: await deps.gateway.find(clubId, input.providerPaymentId) });
  };
}

export interface StartOrderPaymentInput {
  orderId: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId: string | null;
  payerEmail: string;
}

/** HU-24: pay the order with Yape or card, on the organizer's account. */
export function makeStartOrderMercadoPagoPayment(
  deps: MercadoPagoDeps & { serviceFees: ServiceFees },
  settle: ReturnType<typeof makeSettleOrderPayment>,
) {
  return async function startOrderMercadoPagoPayment(input: StartOrderPaymentInput) {
    const pending = await deps.transactions.run(async (tx) => {
      const order = await lockOrder(deps.orders, input.orderId, tx);
      assertPendingPayment(order);
      if (!(await deps.gateway.isEnabled(order.clubId))) {
        throw new MercadoPagoUnavailableError(order.clubId);
      }
      // HU-22: the club's service fee applies to store payments by Mercado Pago too.
      const serviceFeeCents = await deps.serviceFees.forCharge(order.clubId, order.totalCents);
      const amountCents = order.totalCents + serviceFeeCents;
      const { id } = await deps.payments.recordMercadoPago(
        { clubId: order.clubId, orderId: order.id, amountCents, serviceFeeCents },
        tx,
      );
      return { paymentId: id, clubId: order.clubId, amountCents };
    });

    const report = await deps.gateway.charge(pending.clubId, {
      amountCents: pending.amountCents,
      token: input.token,
      paymentMethodId: input.paymentMethodId,
      installments: input.installments,
      issuerId: input.issuerId,
      payerEmail: input.payerEmail,
      description: "Pedido de la tienda en Convoley",
      externalReference: pending.paymentId,
      idempotencyKey: pending.paymentId,
    });
    await deps.payments.attachProviderId(pending.paymentId, report.providerPaymentId);
    const settlement = await settle({ clubId: pending.clubId, report });
    return { result: report.result, statusDetail: report.statusDetail, settlement };
  };
}

/** HU-24: the player paid the organizer by Yape/Plin and uploads the screenshot. */
export function makeSubmitOrderVoucher(deps: {
  orders: OrderRepository;
  payments: OrderPayments;
  transactions: TransactionRunner;
}) {
  return async function submitOrderVoucher(input: {
    orderId: string;
    image: { bytes: Uint8Array; contentType: string };
    yapeSecurityCode: string | null;
  }) {
    // Checked before uploading, so a double submit leaves no files behind.
    await deps.transactions.run(async (tx) =>
      assertPendingPayment(await lockOrder(deps.orders, input.orderId, tx)),
    );
    const proofFileKey = await deps.payments.storeVoucherImage(input.image);
    await deps.transactions.run(async (tx) => {
      const order = await lockOrder(deps.orders, input.orderId, tx);
      assertPendingPayment(order);
      await deps.payments.recordVoucher(
        {
          clubId: order.clubId,
          orderId: order.id,
          amountCents: order.totalCents,
          proofFileKey,
          yapeSecurityCode: input.yapeSecurityCode,
        },
        tx,
      );
      await deps.orders.setStatus(order.id, "in_review", tx);
    });
  };
}
