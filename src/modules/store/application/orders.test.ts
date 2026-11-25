import { describe, expect, test } from "vitest";
import {
  InvalidCartError,
  MercadoPagoUnavailableError,
  OrderStatusError,
  PickupEventNotAvailableError,
} from "../domain/errors";
import {
  fakeGateway,
  fakeOrderPayments,
  fakeOrderRepository,
  fakeTransactions,
  storedOrder,
} from "./fakes";
import {
  makeCreateOrder,
  makeSettleOrderNotification,
  makeSettleOrderPayment,
  makeStartOrderMercadoPagoPayment,
  makeSubmitOrderVoucher,
} from "./orders";
import type { ChargeReport, SellableVariant, StoredOrder, StoredPayment } from "./ports";

const buyer = { firstName: "Ana", lastName: "Pérez", phone: "+51987654321", userId: null };
const club = { id: "club-1", slug: "voley" };

function setupCreate(variants?: SellableVariant[], pickupOk = true) {
  const { repository, created } = fakeOrderRepository({ variants });
  const createOrder = makeCreateOrder({
    orders: repository,
    pickupEvents: { isAvailable: async () => pickupOk },
  });
  return { createOrder, created };
}

describe("HU-24: carrito simple", () => {
  test("el pedido toma precios del servidor y los congela con el total", async () => {
    const { createOrder, created } = setupCreate([
      { variantId: "var-s", priceCents: 4500, stock: 5 },
      { variantId: "cap", priceCents: 2000, stock: 1 },
    ]);
    await createOrder({
      club,
      pickupEventId: "evt-1",
      buyer,
      lines: [
        { variantId: "var-s", quantity: 2 },
        { variantId: "cap", quantity: 1 },
      ],
    });
    expect(created[0]).toMatchObject({
      totalCents: 11_000,
      items: [
        { variantId: "var-s", quantity: 2, unitPriceCents: 4500 },
        { variantId: "cap", quantity: 1, unitPriceCents: 2000 },
      ],
    });
  });

  test("rechaza tallas de otro club u ocultas, y cantidades sin stock", async () => {
    const { createOrder } = setupCreate();
    const order = (variantId: string, quantity: number) =>
      createOrder({ club, pickupEventId: "evt-1", buyer, lines: [{ variantId, quantity }] });
    await expect(order("ajena", 1)).rejects.toMatchObject({ reason: "unavailable" });
    await expect(order("var-s", 4)).rejects.toBeInstanceOf(InvalidCartError);
  });
});

describe("HU-24: elegir en qué convocatoria lo recoge", () => {
  test("solo en una convocatoria próxima del club", async () => {
    const { createOrder, created } = setupCreate(undefined, false);
    await expect(
      createOrder({
        club,
        pickupEventId: "pasada",
        buyer,
        lines: [{ variantId: "var-s", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(PickupEventNotAvailableError);
    expect(created).toHaveLength(0);
  });
});

function setupPayment(
  options: {
    orders?: StoredOrder[];
    payments?: StoredPayment[];
    stock?: number;
    answer?: Partial<ChargeReport>;
    enabled?: boolean;
  } = {},
) {
  const orderRepo = fakeOrderRepository({
    orders: options.orders ?? [storedOrder()],
    variants: [{ variantId: "var-s", priceCents: 4500, stock: options.stock ?? 3 }],
  });
  const { gateway, calls } = fakeGateway({ answer: options.answer, enabled: options.enabled });
  const { payments, rows } = fakeOrderPayments(options.payments);
  const deps = { orders: orderRepo.repository, gateway, payments, transactions: fakeTransactions };
  const settle = makeSettleOrderPayment(deps);
  return {
    start: makeStartOrderMercadoPagoPayment(
      { ...deps, serviceFees: { forCharge: async () => 100 } },
      settle,
    ),
    notify: makeSettleOrderNotification(deps, settle),
    submitVoucher: makeSubmitOrderVoucher(deps),
    orders: orderRepo.orders,
    variants: orderRepo.variants,
    rows,
    calls,
  };
}

const payInput = {
  orderId: "ord-1",
  token: "tok",
  paymentMethodId: "yape",
  installments: 1,
  issuerId: null,
  payerEmail: "ana@example.com",
};

describe("HU-24: mismos métodos de pago que la inscripción", () => {
  test("Mercado Pago: cobra total + cargo en la cuenta del organizador y marca pagado", async () => {
    const { start, orders, calls, rows } = setupPayment();
    const outcome = await start(payInput);
    expect(calls.charged[0]).toMatchObject({ amountCents: 9100 });
    expect(outcome.settlement).toBe("mark_paid");
    expect(orders[0]!.status).toBe("paid");
    expect(rows[0]).toMatchObject({ status: "approved", orderId: "ord-1" });
  });

  test("Mercado Pago no conectado: no se cobra", async () => {
    const { start, calls } = setupPayment({ enabled: false });
    await expect(start(payInput)).rejects.toBeInstanceOf(MercadoPagoUnavailableError);
    expect(calls.charged).toHaveLength(0);
  });

  test("voucher: el pedido pasa a revisión con el monto del pedido", async () => {
    const { submitVoucher, orders, rows } = setupPayment();
    await submitVoucher({
      orderId: "ord-1",
      image: { bytes: new Uint8Array(), contentType: "image/png" },
      yapeSecurityCode: null,
    });
    expect(orders[0]!.status).toBe("in_review");
    expect(rows[0]).toMatchObject({ amountCents: 9000, status: "in_review" });
    await expect(
      submitVoucher({
        orderId: "ord-1",
        image: { bytes: new Uint8Array(), contentType: "image/png" },
        yapeSecurityCode: null,
      }),
    ).rejects.toBeInstanceOf(OrderStatusError);
  });
});

describe("HU-23: el stock se descuenta al pagar", () => {
  const pendingPayment: StoredPayment = {
    id: "pay-1",
    clubId: "club-1",
    orderId: "ord-1",
    amountCents: 9000,
    status: "pending",
  };

  test("el webhook aprobado descuenta el stock una sola vez", async () => {
    const { notify, variants } = setupPayment({
      payments: [{ ...pendingPayment, providerPaymentId: "mp-1" } as StoredPayment],
    });
    expect(await notify({ providerPaymentId: "mp-1", mpUserId: "seller-1" })).toBe("mark_paid");
    expect(await notify({ providerPaymentId: "mp-1", mpUserId: "seller-1" })).toBe("ignore");
    expect(variants[0]!.stock).toBe(1);
  });

  test("si se agotó mientras pagaba: se devuelve y el pedido se cancela", async () => {
    const { notify, orders, calls, variants } = setupPayment({
      stock: 1,
      payments: [{ ...pendingPayment, providerPaymentId: "mp-1" } as StoredPayment],
    });
    expect(await notify({ providerPaymentId: "mp-1", mpUserId: null })).toBe("out_of_stock_refund");
    expect(orders[0]!.status).toBe("cancelled");
    expect(calls.refunded).toEqual(["mp-1"]);
    expect(variants[0]!.stock).toBe(1);
  });

  test("un monto distinto al del pedido no marca nada", async () => {
    const { notify, orders } = setupPayment({
      answer: { amountCents: 100 },
      payments: [{ ...pendingPayment, providerPaymentId: "mp-1" } as StoredPayment],
    });
    expect(await notify({ providerPaymentId: "mp-1", mpUserId: null })).toBe("mismatch");
    expect(orders[0]!.status).toBe("pending_payment");
  });
});
