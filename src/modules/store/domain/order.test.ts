import { describe, expect, test } from "vitest";
import { inStock, orderTotalCents, validateCart } from "./cart";
import { InvalidCartError } from "./errors";
import { ORDER_FILTERS, orderSettlement } from "./order";

describe("HU-24: carrito simple", () => {
  test("suma cantidades de la misma talla y calcula el total en céntimos", () => {
    expect(
      validateCart([
        { variantId: "v1", quantity: 1 },
        { variantId: "v1", quantity: 2 },
        { variantId: "v2", quantity: 1 },
      ]),
    ).toEqual([
      { variantId: "v1", quantity: 3 },
      { variantId: "v2", quantity: 1 },
    ]);
    expect(
      orderTotalCents([
        { quantity: 3, unitPriceCents: 4500 },
        { quantity: 1, unitPriceCents: 1250 },
      ]),
    ).toBe(14_750);
  });

  test("rechaza carrito vacío y cantidades fuera de 1 a 10", () => {
    expect(() => validateCart([])).toThrow(InvalidCartError);
    expect(() => validateCart([{ variantId: "v1", quantity: 0 }])).toThrow(InvalidCartError);
    expect(() => validateCart([{ variantId: "v1", quantity: 11 }])).toThrow(InvalidCartError);
  });

  test("hay stock solo si alcanza para cada línea", () => {
    const stock = new Map([["v1", 2]]);
    expect(inStock([{ variantId: "v1", quantity: 2 }], stock)).toBe(true);
    expect(inStock([{ variantId: "v1", quantity: 3 }], stock)).toBe(false);
    expect(inStock([{ variantId: "v9", quantity: 1 }], stock)).toBe(false);
  });
});

describe("HU-23/HU-24: el stock se descuenta al pagar", () => {
  const base = {
    charge: "approved",
    paymentStatus: "pending",
    orderStatus: "pending_payment",
    inStock: true,
  } as const;

  test("pago aprobado con stock: pedido pagado", () => {
    expect(orderSettlement(base)).toBe("mark_paid");
  });

  test("se agotó mientras pagaba: devolución y pedido cancelado", () => {
    expect(orderSettlement({ ...base, inStock: false })).toBe("out_of_stock_refund");
  });

  test("idempotente y sin cobrar dos veces", () => {
    expect(orderSettlement({ ...base, paymentStatus: "approved" })).toBe("ignore");
    expect(orderSettlement({ ...base, orderStatus: "paid" })).toBe("refund");
    expect(orderSettlement({ ...base, paymentStatus: "refund_pending" })).toBe("retry_refund");
    expect(orderSettlement({ ...base, charge: "rejected" })).toBe("mark_rejected");
    expect(orderSettlement({ ...base, charge: "pending" })).toBe("keep_pending");
  });
});

describe("HU-25: filtro por estado", () => {
  test("pendiente reúne sin pagar y en revisión", () => {
    expect(ORDER_FILTERS.pending).toEqual(["pending_payment", "in_review"]);
    expect(ORDER_FILTERS.delivered).toEqual(["delivered"]);
  });
});
