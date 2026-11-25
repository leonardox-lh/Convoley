import { describe, expect, test } from "vitest";
import {
  activation,
  availableCredits,
  pickPurchaseForCredit,
  purchaseSettlement,
  type CreditSource,
} from "./purchase";

const PAID = new Date("2026-12-01T12:00:00Z");
const event = { communityId: "amateur", startsAt: new Date("2026-12-10T00:00:00Z") };
const purchase = (overrides: Partial<CreditSource> = {}): CreditSource => ({
  id: "p1",
  status: "active",
  creditsRemaining: 3,
  expiresAt: null,
  communityIds: ["amateur"],
  ...overrides,
});

describe("HU-27: ver créditos restantes", () => {
  test("al pagar, el plan tiene sus fechas y vence según su vigencia", () => {
    expect(activation({ creditCount: 4, validityDays: 30 }, PAID)).toEqual({
      paidAt: PAID,
      creditsRemaining: 4,
      expiresAt: new Date("2026-12-31T12:00:00Z"),
    });
    expect(activation({ creditCount: null, validityDays: null }, PAID).expiresAt).toBeNull();
  });

  test("suma los créditos que sirven para la convocatoria; mensualidad = ilimitados", () => {
    expect(availableCredits([purchase(), purchase({ id: "p2", creditsRemaining: 1 })], event)).toBe(
      4,
    );
    expect(availableCredits([purchase({ creditsRemaining: null })], event)).toBeNull();
    expect(availableCredits([purchase({ communityIds: ["general"] })], event)).toBe(0);
  });
});

describe("HU-27: qué plan paga la inscripción", () => {
  test("solo activo, de la comunidad, vigente en la fecha y con créditos", () => {
    expect(pickPurchaseForCredit([purchase({ status: "in_review" })], event)).toBeNull();
    expect(pickPurchaseForCredit([purchase({ creditsRemaining: 0 })], event)).toBeNull();
    expect(
      pickPurchaseForCredit([purchase({ expiresAt: new Date("2026-12-09T00:00:00Z") })], event),
    ).toBeNull();
  });

  test("usa primero el que vence antes", () => {
    const later = purchase({ id: "later", expiresAt: new Date("2027-01-31T00:00:00Z") });
    const sooner = purchase({ id: "sooner", expiresAt: new Date("2026-12-20T00:00:00Z") });
    expect(pickPurchaseForCredit([later, purchase({ id: "forever" }), sooner], event)?.id).toBe(
      "sooner",
    );
  });
});

describe("HU-27: comprar un plan con Mercado Pago", () => {
  const base = {
    charge: "approved",
    paymentStatus: "pending",
    purchaseStatus: "pending_payment",
  } as const;
  test("aprobado activa el plan; un segundo pago se devuelve; idempotente", () => {
    expect(purchaseSettlement(base)).toBe("activate");
    expect(purchaseSettlement({ ...base, purchaseStatus: "active" })).toBe("refund");
    expect(purchaseSettlement({ ...base, paymentStatus: "approved" })).toBe("ignore");
    expect(purchaseSettlement({ ...base, charge: "rejected" })).toBe("mark_rejected");
  });
});
